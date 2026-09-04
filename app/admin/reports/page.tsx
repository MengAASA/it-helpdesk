import type { Metadata } from "next";
import {
  Ticket,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Users2,
  Flag,
  TimerReset,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import KpiCard from "../KpiCard";

export const metadata: Metadata = {
  title: "Reports · Admin",
};

type CountRow = { label: string; count: number };

const BAR_COLORS = [
  "bg-[color:var(--color-blue)]",
  "bg-[color:var(--color-violet)]",
  "bg-[color:var(--color-rose)]",
  "bg-[color:var(--color-emerald)]",
  "bg-[color:var(--color-amber-solid)]",
  "bg-primary",
];

async function countBy(column: "status" | "team" | "priority"): Promise<CountRow[]> {
  const rows = await prisma.tickets.groupBy({
    by: [column],
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });
  return rows.map((r) => ({ label: r[column], count: r._count }));
}

function ReportCard({
  title,
  icon: Icon,
  rows,
  total,
}: {
  title: string;
  icon: LucideIcon;
  rows: CountRow[];
  total: number;
}) {
  return (
    <div className="flex flex-1 min-w-[260px] flex-col gap-[13.5px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="inline-flex items-center gap-[7.5px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
        <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-result-bg text-primary">
          <Icon size={13} strokeWidth={2.25} />
        </span>
        {title}
      </span>
      <div className="flex flex-col gap-[10.5px]">
        {rows.map((row, i) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.label} className="flex flex-col gap-[4.5px]">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-medium text-ink">{row.label}</span>
                <span className="text-muted-2">
                  {row.count} <span className="text-faint">({pct}%)</span>
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-divider">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <span className="text-[10.5px] text-faint">No data yet.</span>}
      </div>
    </div>
  );
}

export default async function AdminReports() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId) : null;
  if (!permissions?.viewReports) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Reports</h1>
        <RestrictedMessage message="You don't have permission to view reports." />
      </div>
    );
  }

  const total = await prisma.tickets.count();
  const [byStatus, byTeam, byPriority] = await Promise.all([
    countBy("status"),
    countBy("team"),
    countBy("priority"),
  ]);
  const [slaRows, slaHours] = await Promise.all([
    prisma.tickets.findMany({ select: { status: true, priority: true, created_at: true } }),
    getSlaHours(),
  ]);

  const openCount = byStatus.find((r) => r.label === "Open")?.count ?? 0;
  const highCount = byPriority.find((r) => r.label === "High")?.count ?? 0;
  const closedCount = byStatus.find((r) => r.label === "Closed")?.count ?? 0;
  const overdueCount = slaRows.filter((t) => isOverdue(t, slaHours)).length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[9px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Reports</h1>
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/admin/reports/export`}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border border-card-border bg-white px-[13.5px] py-[8px] text-[9.75px] font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Download size={12} strokeWidth={2.25} />
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-[12px]">
        <KpiCard label="Total tickets" value={total} icon={Ticket} tone="violet" />
        <KpiCard label="Open" value={openCount} icon={CircleDot} tone="primary" />
        <KpiCard label="High priority" value={highCount} icon={AlertTriangle} tone="rose" />
        <KpiCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Overdue (SLA)" value={overdueCount} icon={TimerReset} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-[15px]">
        <ReportCard title="By status" icon={Activity} rows={byStatus} total={total} />
        <ReportCard title="By team" icon={Users2} rows={byTeam} total={total} />
        <ReportCard title="By priority" icon={Flag} rows={byPriority} total={total} />
      </div>
    </div>
  );
}
