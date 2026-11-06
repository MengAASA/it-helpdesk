import Link from "next/link";
import { UserRound } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { countBy, formatDuration, getAgentPerformance, getAvgResolutionHours, getWeeklyFlow, type CountRow } from "@/app/lib/reportsData";
import Avatar from "@/app/components/Avatar";
import { FlipBlock } from "../SidebarFlip";
import { Tile, Quiet } from "../Tile";
import { ROW_WIPE } from "../rowHover";
import { SegmentBar } from "../DashboardCharts";
import ExportMenu from "./ExportMenu";
import { RankList, PriorityColumns, Gauge, WeekColumns, percent } from "./Charts";
import TeamDonut from "./TeamDonut";

const WEEKS = 12;

/** The request's clock, kept out of the component body so render stays pure. */
function reportTime(): number {
  return Date.now();
}

/** Blank values (no department or site given) are grouped under one honest label. */
function named(rows: CountRow[]): CountRow[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    const label = r.label?.trim() ? r.label : "Not specified";
    merged.set(label, (merged.get(label) ?? 0) + r.count);
  }
  return [...merged.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function BigNumber({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <div className="flex items-end gap-[8px]">
      <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{value}</span>
      {unit && <span className="pb-[5px] text-[13px] text-muted-2">{unit}</span>}
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${className}`} aria-hidden="true" />;
}

/** The report itself. The page checks the viewReports permission before rendering this. */
export default async function ReportsBody() {
  const now = reportTime();
  const total = await prisma.tickets.count();
  const [byStatus, byTeam, byPriority, byCategory, byDepartment, byLocation] = await Promise.all([
    countBy("status"),
    countBy("team"),
    countBy("priority"),
    countBy("category"),
    countBy("department"),
    countBy("location"),
  ]);
  const [slaRows, slaHours, avgResolution, agentRows, csatUpCount, csatDownCount, weeks] = await Promise.all([
    prisma.tickets.findMany({ select: { status: true, priority: true, created_at: true } }),
    getSlaHours(),
    getAvgResolutionHours(),
    getAgentPerformance(),
    prisma.tickets.count({ where: { feedback: "up" } }),
    prisma.tickets.count({ where: { feedback: "down" } }),
    getWeeklyFlow(now, WEEKS),
  ]);

  const statusCount = (s: string) => byStatus.find((r) => r.label === s)?.count ?? 0;
  const openCount = statusCount("Open");
  const inProgressCount = statusCount("In Progress");
  const closedCount = statusCount("Closed");
  const notClosed = total - closedCount;
  const overdueCount = slaRows.filter((t) => isOverdue(t, slaHours)).length;
  const csatTotal = csatUpCount + csatDownCount;
  const csatPct = csatTotal > 0 ? Math.round((csatUpCount / csatTotal) * 100) : null;
  const closedPct = total > 0 ? Math.round((closedCount / total) * 100) : null;
  const weekCreated = weeks.reduce((n, w) => n + w.created, 0);
  const weekClosed = weeks.reduce((n, w) => n + w.resolved, 0);
  const maxAssigned = Math.max(1, ...agentRows.map((a) => a.assigned));
  const asOf = new Date(now).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    // data-sidebar-flip: these cards animate their own move when the sidebar toggles (see SidebarFlip).
    <div data-sidebar-flip="" className="flex flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <FlipBlock className="flex flex-col gap-[2px]">
          <p className="text-[13px] text-muted-2">Live data · as of {asOf}</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Reports</h1>
          <p className="text-[13px] tabular-nums text-muted">
            {total.toLocaleString()} tickets · {notClosed} not closed · {closedPct ?? 0}% closed
          </p>
        </FlipBlock>
        <ExportMenu />
      </div>

      <div className="columns-[300px] gap-[16px]">
        <Tile title="All tickets" meta="By current status" href="/admin/tickets" tone="ink">
          <BigNumber value={total.toLocaleString()} unit={total === 1 ? "ticket" : "tickets"} />
          <div className="mt-[16px]">
            <SegmentBar
              height={8}
              segments={[
                { label: "Open", value: openCount, className: "bg-chart-sky" },
                { label: "In progress", value: inProgressCount, className: "bg-primary-light" },
                { label: "Closed", value: closedCount, className: "bg-lime-bright" },
              ]}
            />
          </div>
          <div className="mt-[12px] flex flex-wrap gap-x-[16px] gap-y-[6px] text-[13px]">
            {[
              { label: "Open", value: openCount, dot: "bg-chart-sky", status: "Open" },
              { label: "In progress", value: inProgressCount, dot: "bg-primary-light", status: "In Progress" },
              { label: "Closed", value: closedCount, dot: "bg-lime-bright", status: "Closed" },
            ].map((s) => (
              <Link
                key={s.label}
                href={`/admin/tickets?status=${encodeURIComponent(s.status)}`}
                className="inline-flex items-center gap-[6px] text-muted transition-colors hover:text-ink"
              >
                <LegendDot className={s.dot} />
                {s.label} <span className="font-semibold tabular-nums text-ink">{s.value}</span>
              </Link>
            ))}
          </div>
        </Tile>

        <Tile title="Created vs closed" meta={`Last ${WEEKS} weeks, by week`}>
          {weekCreated === 0 && weekClosed === 0 ? (
            <Quiet>Nothing was created or closed in the last {WEEKS} weeks.</Quiet>
          ) : (
            <>
              <WeekColumns weeks={weeks} />
              <div className="mt-[10px] flex gap-[16px] text-[13px] text-muted">
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-primary" />
                  <span className="font-semibold tabular-nums text-ink">{weekCreated}</span> created
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-lime-bright" />
                  <span className="font-semibold tabular-nums text-ink">{weekClosed}</span> closed
                </span>
              </div>
            </>
          )}
        </Tile>

        <Tile title="Closed rate" meta="Share of all tickets now closed" tone="soft">
          <div className="flex flex-col items-center">
            <Gauge pct={closedPct} accent="violet" />
            <span className="-mt-[22px] text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">
              {closedPct === null ? "—" : `${closedPct}%`}
            </span>
            <span className="mt-[6px] text-[13px] tabular-nums text-muted">
              {closedCount} of {total} closed
            </span>
          </div>
        </Tile>

        <Tile
          title="Avg. time to close"
          meta={avgResolution.sampleSize > 0 ? `Across ${avgResolution.sampleSize} ${avgResolution.sampleSize === 1 ? "ticket" : "tickets"} with a logged closure` : undefined}
        >
          {avgResolution.avgHours === null ? (
            <Quiet>No closures have been logged yet.</Quiet>
          ) : (
            <BigNumber value={formatDuration(avgResolution.avgHours)} unit="from open to closed" />
          )}
        </Tile>

        <Tile title="By priority" meta="All tickets">
          <PriorityColumns rows={byPriority} total={total} />
        </Tile>

        <Tile title="By team" meta="All tickets" tone="ink">
          <TeamDonut rows={named(byTeam)} total={total} />
        </Tile>

        <Tile title="Team leaderboard" meta="Tickets assigned per person, all time">
          {agentRows.length === 0 ? (
            <Quiet>No tickets yet.</Quiet>
          ) : (
            <>
              <div className="mb-[8px] flex gap-[16px] text-[12px] text-muted-2">
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-primary" /> Not closed
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-lime-bright" /> Closed
                </span>
              </div>
              <ul className="-mx-[8px] flex flex-col">
                {agentRows.map((a) => {
                  const open = a.assigned - a.closed;
                  const csatN = a.csatUp + a.csatDown;
                  const unassigned = a.name === "Unassigned";
                  const details = [
                    `${open} not closed`,
                    `${a.closed} closed`,
                    a.avgResolutionHours !== null ? `avg ${formatDuration(a.avgResolutionHours)}` : null,
                    csatN > 0 ? `CSAT ${percent(a.csatUp, csatN)}% (${csatN})` : null,
                  ].filter(Boolean);
                  return (
                    <li key={a.name} className={`${ROW_WIPE} rounded-[10px] px-[8px] py-[8px] before:bg-surface-2`}>
                      <div className="flex items-center gap-[10px]">
                        {unassigned ? (
                          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-dashed border-faint/60 text-faint">
                            <UserRound size={13} strokeWidth={2} />
                          </span>
                        ) : (
                          <Avatar name={a.name} size={26} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-[10px]">
                            <span className={`truncate text-[13px] font-medium ${unassigned ? "text-muted" : "text-ink"}`}>{a.name}</span>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{a.assigned}</span>
                          </div>
                          <div className="mt-[6px] h-[5px] w-full">
                            <div
                              className="grow-x flex h-full gap-[2px]"
                              style={{ width: `${(a.assigned / maxAssigned) * 100}%` }}
                              title={`${open} not closed, ${a.closed} closed`}
                            >
                              {open > 0 && <span className="h-full rounded-full bg-primary" style={{ flexGrow: open, flexBasis: 0 }} />}
                              {a.closed > 0 && <span className="h-full rounded-full bg-lime-bright" style={{ flexGrow: a.closed, flexBasis: 0 }} />}
                            </div>
                          </div>
                          <p className="mt-[5px] truncate text-[12px] tabular-nums text-muted-2">{details.join(" · ")}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Tile>

        <Tile title="By category" meta="All tickets, share of total">
          <RankList rows={named(byCategory)} total={total} accent="violet" />
        </Tile>

        <Tile title="By department" meta="All tickets, share of total" tone="ink">
          <RankList rows={named(byDepartment)} total={total} accent="lime" />
        </Tile>

        <Tile title="By site" meta="All tickets, share of total">
          <RankList rows={named(byLocation)} total={total} accent="sky" />
        </Tile>

        <Tile title="Satisfaction" meta="Requester ratings on closed tickets" tone="ink">
          {csatPct === null ? (
            <Quiet>No ratings yet.</Quiet>
          ) : (
            <>
              <BigNumber value={`${csatPct}%`} unit="positive" />
              <div className="mt-[16px]">
                <SegmentBar
                  height={8}
                  segments={[
                    { label: "Positive", value: csatUpCount, className: "bg-lime-bright" },
                    { label: "Negative", value: csatDownCount, className: "bg-chart-pink" },
                  ]}
                />
              </div>
              <div className="mt-[12px] flex gap-[16px] text-[13px] text-muted">
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-lime-bright" />
                  <span className="font-semibold tabular-nums text-ink">{csatUpCount}</span> positive
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <LegendDot className="bg-chart-pink" />
                  <span className="font-semibold tabular-nums text-ink">{csatDownCount}</span> negative
                </span>
              </div>
            </>
          )}
        </Tile>

        {slaHours.enabled && (
          <Tile title="Overdue now" meta="Open tickets past their SLA target" href="/admin/tickets?overdue=1" tone="soft">
            <BigNumber value={overdueCount} unit={`of ${notClosed} not closed`} />
          </Tile>
        )}
      </div>
    </div>
  );
}
