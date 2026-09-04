import type { Metadata } from "next";
import { Ticket, CircleDot, AlertTriangle, CheckCircle2, TimerReset } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import TicketsTable from "./TicketsTable";
import KpiCard from "./KpiCard";
import type { AssigneeOption } from "./tickets/[ticketNumber]/AssigneeLookup";

export const metadata: Metadata = {
  title: "Open tickets · Admin",
};

export default async function AdminHome() {
  const [tickets, slaHours, session] = await Promise.all([
    prisma.tickets.findMany({ orderBy: { created_at: "desc" }, take: 1000 }),
    getSlaHours(),
    getIamsSession(),
  ]);
  const permissions = session ? await getPermissionsFor(session.staffId) : null;
  const canManage = permissions?.manageTickets ?? false;

  let assigneeOptions: AssigneeOption[] = [];
  if (canManage) {
    const iamsResult = await getIamsUsers();
    assigneeOptions = (iamsResult.users ?? [])
      .filter((u) => u.status === "approved")
      .map((u) => ({ name: u.name, staffId: u.staffId, isTeamMember: false }));
  }

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const highCount = tickets.filter((t) => t.priority === "High").length;
  const closedCount = tickets.filter((t) => t.status === "Closed").length;
  const overdueCount = tickets.filter((t) => isOverdue(t, slaHours)).length;

  return (
    <div className="flex flex-col gap-[18px]">
      <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Open tickets</h1>

      <div className="flex flex-wrap gap-[12px]">
        <KpiCard label="Total tickets" value={tickets.length} icon={Ticket} tone="violet" />
        <KpiCard label="Open" value={openCount} icon={CircleDot} tone="primary" />
        <KpiCard label="High priority" value={highCount} icon={AlertTriangle} tone="rose" />
        <KpiCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Overdue (SLA)" value={overdueCount} icon={TimerReset} tone="amber" />
      </div>

      <TicketsTable
        tickets={tickets.map((t) => ({
          ...t,
          submittedLabel: new Date(t.created_at).toLocaleString(),
        }))}
        slaHours={slaHours}
        canManage={canManage}
        assigneeOptions={assigneeOptions}
      />
    </div>
  );
}
