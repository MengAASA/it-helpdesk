import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { TEAMS } from "@/app/lib/teams";

/*
 * Suggestions for the admin top bar search, while the person types. Returns a few matching
 * tickets plus quick filters (assignee, category, team, status) that the tickets list understands.
 * Anyone who can open the admin area can already see every ticket on the tickets list, so this
 * only needs a signed-in session.
 */

export type SearchSuggestions = {
  tickets: {
    ticketNumber: string;
    subject: string;
    status: string;
    requester: string;
    createdAt: string;
  }[];
  filters: {
    kind: "assignee" | "category" | "team" | "status";
    value: string;
    count: number;
  }[];
};

const TICKET_LIMIT = 6;
const FILTER_LIMIT = 5;
const STATUSES = ["Open", "In Progress", "Closed"];
const EMPTY: SearchSuggestions = { tickets: [], filters: [] };

export async function GET(req: Request) {
  const session = await getIamsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json(EMPTY);

  // Ticket IDs match without their dashes too: "svzsr4ba" finds TCK-SVZS-R4BA.
  const compact = q.replace(/[\s-]/g, "");
  const idMatches =
    compact.length >= 3 && /^[a-z0-9]+$/i.test(compact)
      ? await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM tickets
          WHERE REPLACE(ticket_number, '-', '') LIKE CONCAT('%', ${compact}, '%')
          ORDER BY created_at DESC LIMIT ${TICKET_LIMIT}`
      : [];

  const lower = q.toLowerCase();
  const [byId, byText, assignees, categories] = await Promise.all([
    idMatches.length
      ? prisma.tickets.findMany({ where: { id: { in: idMatches.map((r) => r.id) } }, orderBy: { created_at: "desc" } })
      : Promise.resolve([]),
    prisma.tickets.findMany({
      where: {
        OR: [
          { ticket_number: { contains: q } },
          { subject: { contains: q } },
          { name: { contains: q } },
          { staff_no: { contains: q } },
          { email: { contains: q } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: TICKET_LIMIT,
    }),
    prisma.tickets.groupBy({
      by: ["assigned_to"],
      where: { assigned_to: { contains: q } },
      _count: { _all: true },
      orderBy: { _count: { assigned_to: "desc" } },
      take: FILTER_LIMIT,
    }),
    prisma.tickets.groupBy({
      by: ["category"],
      where: { category: { contains: q } },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: FILTER_LIMIT,
    }),
  ]);

  const seen = new Set<number>();
  const tickets = [...byId, ...byText]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .slice(0, TICKET_LIMIT)
    .map((t) => ({
      ticketNumber: t.ticket_number,
      subject: t.subject,
      status: t.status,
      requester: t.name,
      createdAt: t.created_at.toISOString(),
    }));

  const teams = TEAMS.filter((t) => t.toLowerCase().includes(lower));
  const statuses = STATUSES.filter((s) => s.toLowerCase().includes(lower));
  const [teamCounts, statusCounts] = await Promise.all([
    teams.length ? prisma.tickets.groupBy({ by: ["team"], where: { team: { in: teams } }, _count: { _all: true } }) : Promise.resolve([]),
    statuses.length ? prisma.tickets.groupBy({ by: ["status"], where: { status: { in: statuses } }, _count: { _all: true } }) : Promise.resolve([]),
  ]);

  // At most two of each kind, so one kind (say, seven "Admin - …" categories) can't crowd out the rest.
  const perKind = <T,>(rows: T[]) => rows.slice(0, 2);
  const filters: SearchSuggestions["filters"] = [
    ...perKind(assignees.filter((a) => a.assigned_to)).map((a) => ({ kind: "assignee" as const, value: a.assigned_to!, count: a._count._all })),
    ...perKind(teamCounts).map((t) => ({ kind: "team" as const, value: t.team, count: t._count._all })),
    ...perKind(statusCounts).map((s) => ({ kind: "status" as const, value: s.status, count: s._count._all })),
    ...perKind(categories).map((c) => ({ kind: "category" as const, value: c.category, count: c._count._all })),
  ].slice(0, FILTER_LIMIT);

  return NextResponse.json({ tickets, filters } satisfies SearchSuggestions);
}
