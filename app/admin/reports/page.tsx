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
  Clock,
  ThumbsUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { countBy, getAgentPerformance, type CountRow } from "@/app/lib/reportsData";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import KpiCard from "../KpiCard";
import ExportMenu from "./ExportMenu";

export const metadata: Metadata = {
  title: "Reports · Admin",
};

const BAR_COLORS = [
  "bg-[color:var(--color-blue)]",
  "bg-[color:var(--color-violet)]",
  "bg-[color:var(--color-rose)]",
  "bg-[color:var(--color-emerald)]",
  "bg-[color:var(--color-amber-solid)]",
  "bg-primary",
];

/**
 * Only tickets whose closure was captured as a "status -> Closed" ticket_events row
 * count toward this average — tickets closed before event logging existed, or closed
 * without a status transition being recorded, aren't included.
 */
async function getAvgResolutionHours(): Promise<{ avgHours: number | null; sampleSize: number }> {
  const closureEvents = await prisma.ticket_events.findMany({
    where: { event_type: "status", to_value: "Closed" },
    select: { ticket_id: true, created_at: true, tickets: { select: { created_at: true } } },
    orderBy: { created_at: "desc" },
  });

  const latestByTicket = new Map<number, number>();
  for (const e of closureEvents) {
    if (latestByTicket.has(e.ticket_id)) continue;
    const hours = (e.created_at.getTime() - e.tickets.created_at.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) latestByTicket.set(e.ticket_id, hours);
  }

  const durations = Array.from(latestByTicket.values());
  if (durations.length === 0) return { avgHours: null, sampleSize: 0 };
  return {
    avgHours: durations.reduce((a, b) => a + b, 0) / durations.length,
    sampleSize: durations.length,
  };
}

function formatDuration(hours: number): string {
  return hours < 48 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
}

function csatTone(pct: number): string {
  if (pct >= 80) return "text-[color:var(--color-emerald-text)]";
  if (pct >= 50) return "text-amber-text-strong";
  return "text-[color:var(--color-rose-text)]";
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
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
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
  const [slaRows, slaHours, avgResolution, agentRows, csatUpCount, csatDownCount] = await Promise.all([
    prisma.tickets.findMany({ select: { status: true, priority: true, created_at: true } }),
    getSlaHours(),
    getAvgResolutionHours(),
    getAgentPerformance(),
    prisma.tickets.count({ where: { feedback: "up" } }),
    prisma.tickets.count({ where: { feedback: "down" } }),
  ]);

  const openCount = byStatus.find((r) => r.label === "Open")?.count ?? 0;
  const highCount = byPriority.find((r) => r.label === "High")?.count ?? 0;
  const closedCount = byStatus.find((r) => r.label === "Closed")?.count ?? 0;
  const overdueCount = slaRows.filter((t) => isOverdue(t, slaHours)).length;
  const csatTotal = csatUpCount + csatDownCount;
  const csatPct = csatTotal > 0 ? Math.round((csatUpCount / csatTotal) * 100) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[9px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Reports</h1>
        <ExportMenu />
      </div>

      <div className="flex flex-wrap gap-[12px]">
        <KpiCard label="Total tickets" value={total} icon={Ticket} tone="violet" />
        <KpiCard label="Open" value={openCount} icon={CircleDot} tone="primary" />
        <KpiCard label="High priority" value={highCount} icon={AlertTriangle} tone="rose" />
        <KpiCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" />
        {slaHours.enabled && (
          <KpiCard label="Overdue (SLA)" value={overdueCount} icon={TimerReset} tone="amber" />
        )}
        <KpiCard
          label={
            avgResolution.avgHours === null
              ? "Avg. time to close"
              : `Avg. time to close (n=${avgResolution.sampleSize})`
          }
          value={avgResolution.avgHours === null ? "—" : formatDuration(avgResolution.avgHours)}
          icon={Clock}
          tone="blue"
        />
        <KpiCard
          label={csatTotal === 0 ? "Satisfaction (CSAT)" : `Satisfaction (CSAT, n=${csatTotal})`}
          value={csatPct === null ? "—" : `${csatPct}%`}
          icon={ThumbsUp}
          tone="emerald"
        />
      </div>

      <div className="flex flex-wrap gap-[15px]">
        <ReportCard title="By status" icon={Activity} rows={byStatus} total={total} />
        <ReportCard title="By team" icon={Users2} rows={byTeam} total={total} />
        <ReportCard title="By priority" icon={Flag} rows={byPriority} total={total} />
      </div>

      <div className="flex flex-col gap-[13.5px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span className="inline-flex items-center gap-[7.5px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
          <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-result-bg text-primary">
            <Users2 size={13} strokeWidth={2.25} />
          </span>
          By agent
        </span>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[10.5px]">
            <thead>
              <tr className="border-b border-card-border text-[9px] uppercase tracking-[0.06em] text-muted-2">
                <th className="px-[12px] py-[9px] font-semibold">Agent</th>
                <th className="px-[12px] py-[9px] font-semibold">Assigned</th>
                <th className="px-[12px] py-[9px] font-semibold">Closed</th>
                <th className="px-[12px] py-[9px] font-semibold">Avg. resolution</th>
                <th className="px-[12px] py-[9px] font-semibold">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map((a, i) => {
                const csatSample = a.csatUp + a.csatDown;
                const agentCsatPct = csatSample > 0 ? Math.round((a.csatUp / csatSample) * 100) : null;
                return (
                  <tr
                    key={a.name}
                    className={`border-b border-divider last:border-b-0 ${i % 2 === 1 ? "bg-result-bg/20" : ""}`}
                  >
                    <td className="whitespace-nowrap px-[12px] py-[10.5px] font-medium text-ink">{a.name}</td>
                    <td className="px-[12px] py-[10.5px] text-muted">{a.assigned}</td>
                    <td className="px-[12px] py-[10.5px] text-muted">{a.closed}</td>
                    <td className="whitespace-nowrap px-[12px] py-[10.5px] text-muted">
                      {a.avgResolutionHours === null ? "—" : formatDuration(a.avgResolutionHours)}
                    </td>
                    <td className="whitespace-nowrap px-[12px] py-[10.5px]">
                      {agentCsatPct === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className={`font-semibold ${csatTone(agentCsatPct)}`}>
                          {agentCsatPct}% <span className="font-normal text-faint">({csatSample})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {agentRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-[12px] py-[18px] text-center text-faint">
                    No tickets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
