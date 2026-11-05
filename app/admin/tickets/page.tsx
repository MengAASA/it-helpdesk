import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import TicketsTable, { SORT_KEYS, type InitialFilters, type SortKey } from "../TicketsTable";
import type { AssigneeOption } from "./[ticketNumber]/AssigneeLookup";

export const metadata: Metadata = {
  title: "Tickets · Admin",
};

const TABLE_ROW_LIMIT = 1000;

/** "10/09/2026" (dd/mm/yyyy) and "14:32" for the Created at column, in the server's time zone like the full timestamp. */
function createdParts(created: Date): { createdDate: string; createdTime: string } {
  const d = new Date(created);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { createdDate: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, createdTime: time };
}

export default async function AdminTickets({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [tickets, slaHours, session, totalCount] = await Promise.all([
    prisma.tickets.findMany({ orderBy: { created_at: "desc" }, take: TABLE_ROW_LIMIT }),
    getSlaHours(),
    getIamsSession(),
    prisma.tickets.count(),
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
  const mine = !!session && initialFilters.assignee === session.name;

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{mine ? "Assigned to me" : "All tickets"}</h1>
        <p className="text-[13px] text-muted-2">
          {mine
            ? "Tickets currently assigned to you."
            : `${totalCount.toLocaleString()} ${totalCount === 1 ? "ticket" : "tickets"} in total.`}
        </p>
      </div>

      {truncated && (
        <div className="flex items-center gap-[8px] rounded-[10px] bg-amber-bg px-[12px] py-[8px] text-[13px] text-amber-text">
          <Info size={14} strokeWidth={1.75} className="shrink-0" />
          Showing the {tickets.length.toLocaleString()} most recent of {totalCount.toLocaleString()} tickets. Older tickets
          aren&apos;t listed here.
        </div>
      )}

      <TicketsTable
        key={`${initialFilters.status}|${initialFilters.priority}|${initialFilters.assignee}|${initialFilters.overdueOnly}|${initialFilters.search}`}
        tickets={tickets.map((t) => ({
          ...t,
          submittedLabel: new Date(t.created_at).toLocaleString(),
          ...createdParts(t.created_at),
        }))}
        slaHours={slaHours}
        canManage={canManage}
        assigneeOptions={assigneeOptions}
        initialFilters={initialFilters}
      />
    </div>
  );
}
