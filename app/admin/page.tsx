import type { Metadata } from "next";
import Link from "next/link";
import {
  Ticket,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  TimerReset,
  UserX,
  Info,
  UserCheck,
  CalendarPlus,
} from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import TicketsTable, { SORT_KEYS, type InitialFilters, type SortKey } from "./TicketsTable";
import KpiCard from "./KpiCard";
import type { AssigneeOption } from "./tickets/[ticketNumber]/AssigneeLookup";

export const metadata: Metadata = {
  title: "Open tickets · Admin",
};

const TABLE_ROW_LIMIT = 1000;

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [tickets, slaHours, session, totalCount, statRows] = await Promise.all([
    prisma.tickets.findMany({ orderBy: { created_at: "desc" }, take: TABLE_ROW_LIMIT }),
    getSlaHours(),
    getIamsSession(),
    prisma.tickets.count(),
    // Counted separately from the (capped) row fetch above so the KPIs stay accurate
    // even once the ticket list grows past TABLE_ROW_LIMIT.
    prisma.tickets.findMany({
      select: { status: true, priority: true, created_at: true, assigned_to: true },
    }),
  ]);
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  const canManage = permissions?.manageTickets ?? false;

  let assigneeOptions: AssigneeOption[] = [];
  if (canManage) {
    const iamsResult = await getIamsUsers();
    assigneeOptions = (iamsResult.users ?? [])
      .filter((u) => u.status === "approved")
      .map((u) => ({ name: u.name, staffId: u.staffId, isTeamMember: false }));
  }

  const openCount = statRows.filter((t) => t.status === "Open").length;
  const highCount = statRows.filter((t) => t.priority === "High").length;
  const closedCount = statRows.filter((t) => t.status === "Closed").length;
  const overdueCount = statRows.filter((t) => isOverdue(t, slaHours)).length;
  const unassignedCount = statRows.filter((t) => !t.assigned_to).length;
  const myTicketsCount = session ? statRows.filter((t) => t.assigned_to === session.name).length : 0;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const newTodayCount = statRows.filter((t) => new Date(t.created_at) >= startOfToday).length;
  const truncated = tickets.length < totalCount;

  const sortParam = typeof params.sort === "string" ? (params.sort as SortKey) : null;
  const initialFilters: InitialFilters = {
    status: typeof params.status === "string" ? params.status : "All",
    priority: typeof params.priority === "string" ? params.priority : "All",
    team: typeof params.team === "string" ? params.team : "All",
    category: typeof params.category === "string" ? params.category : "All",
    assignee: typeof params.assignee === "string" ? params.assignee : "All",
    overdueOnly: params.overdue === "1",
    search: typeof params.q === "string" ? params.q : "",
    sortKey: sortParam && SORT_KEYS.includes(sortParam) ? sortParam : "created_at",
    sortDirection: params.dir === "asc" ? "asc" : "desc",
    page: typeof params.page === "string" && Number(params.page) > 0 ? Number(params.page) : 1,
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Open tickets</h1>

      {truncated && (
        <div className="flex items-center gap-[7.5px] rounded-[10px] border border-amber-border bg-amber-bg px-[13.5px] py-[9px] text-[9.75px] text-amber-text-strong">
          <Info size={13} strokeWidth={2.25} className="shrink-0" />
          Showing the {tickets.length.toLocaleString()} most recent of {totalCount.toLocaleString()} tickets.
          Older tickets aren&apos;t listed below; the counts above still reflect all tickets.
        </div>
      )}

      <div className="flex flex-wrap gap-[12px]">
        <Link href="/admin" className="flex flex-1 min-w-[150px]">
          <KpiCard label="Total tickets" value={totalCount} icon={Ticket} tone="violet" />
        </Link>
        <Link href="/admin?status=Open" className="flex flex-1 min-w-[150px]">
          <KpiCard label="Open" value={openCount} icon={CircleDot} tone="primary" />
        </Link>
        <Link href="/admin?priority=High" className="flex flex-1 min-w-[150px]">
          <KpiCard label="High priority" value={highCount} icon={AlertTriangle} tone="rose" />
        </Link>
        <Link href="/admin?status=Closed" className="flex flex-1 min-w-[150px]">
          <KpiCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" />
        </Link>
        {slaHours.enabled && (
          <Link href="/admin?overdue=1" className="flex flex-1 min-w-[150px]">
            <KpiCard label="Overdue (SLA)" value={overdueCount} icon={TimerReset} tone="amber" />
          </Link>
        )}
        <Link href="/admin?assignee=Unassigned" className="flex flex-1 min-w-[150px]">
          <KpiCard label="Unassigned" value={unassignedCount} icon={UserX} tone="blue" />
        </Link>
        {session && (
          <Link href={`/admin?assignee=${encodeURIComponent(session.name)}`} className="flex flex-1 min-w-[150px]">
            <KpiCard label="My tickets" value={myTicketsCount} icon={UserCheck} tone="teal" />
          </Link>
        )}
        <div className="flex flex-1 min-w-[150px]">
          <KpiCard label="New today" value={newTodayCount} icon={CalendarPlus} tone="violet" />
        </div>
      </div>

      <TicketsTable
        key={`${initialFilters.status}|${initialFilters.priority}|${initialFilters.assignee}|${initialFilters.overdueOnly}`}
        tickets={tickets.map((t) => ({
          ...t,
          submittedLabel: new Date(t.created_at).toLocaleString(),
        }))}
        slaHours={slaHours}
        canManage={canManage}
        assigneeOptions={assigneeOptions}
        initialFilters={initialFilters}
      />
    </div>
  );
}
