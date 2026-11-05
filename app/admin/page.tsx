import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, BarChart3 } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { isAtRisk, isOverdue, slaDueAt, slaTargetHours } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { StatusBadge, PriorityBadge } from "@/app/components/TicketBadges";
import Avatar from "@/app/components/Avatar";
import ButtonLink from "@/app/components/ButtonLink";
import { FlipBlock } from "./SidebarFlip";
import { Tile, Quiet } from "./Tile";
import { ROW_WIPE } from "./rowHover";
import { MirrorBars, SegmentBar, type TrendDay } from "./DashboardCharts";

export const metadata: Metadata = {
  title: "Dashboard · Admin",
};

const TREND_DAYS = 14;
const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Same colours as the priority chips, so priority looks the same on every screen.
const PRIORITY_SEGMENT: Record<string, string> = { High: "bg-prio-high", Normal: "bg-prio-normal", Low: "bg-prio-low" };

// The ticket list used to live at /admin; keep its shareable filter links working.
const LEGACY_LIST_PARAMS = ["status", "priority", "team", "category", "assignee", "overdue", "q", "sort", "dir", "page"];

const WIPE = ROW_WIPE;

/** The request's clock and the day boundaries every figure is measured against. */
function timeWindow() {
  const now = Date.now();
  const today = startOfDay(new Date(now));
  return {
    now,
    today,
    trendStart: new Date(today.getTime() - (TREND_DAYS - 1) * DAY_MS),
    windowStart: new Date(today.getTime() - (WINDOW_DAYS - 1) * DAY_MS),
  };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function age(date: Date, now: number): string {
  const mins = Math.round((now - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function dueLabel(due: Date, now: number): { text: string; late: boolean } {
  const mins = Math.round((due.getTime() - now) / 60000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs}m` : abs < 48 * 60 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return mins >= 0 ? { text: `due in ${span}`, late: false } : { text: `${span} late`, late: true };
}

function countBy<T>(rows: T[], key: (row: T) => string | null): [string, number][] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  if (LEGACY_LIST_PARAMS.some((k) => params[k] !== undefined)) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string") qs.set(k, v);
    redirect(`/admin/tickets?${qs.toString()}`);
  }

  const { now, today, trendStart, windowStart } = timeWindow();

  const [session, slaHours, tickets, closures] = await Promise.all([
    getIamsSession(),
    getSlaHours(),
    prisma.tickets.findMany({
      orderBy: { created_at: "desc" },
      select: {
        ticket_number: true,
        subject: true,
        name: true,
        status: true,
        priority: true,
        category: true,
        created_at: true,
        assigned_to: true,
      },
    }),
    prisma.ticket_events.findMany({
      where: { event_type: "status", to_value: "Closed", created_at: { gte: windowStart } },
      select: { ticket_id: true, created_at: true, tickets: { select: { created_at: true, priority: true } } },
      orderBy: { created_at: "desc" },
    }),
  ]);
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;

  const active = tickets.filter((t) => t.status !== "Closed");
  const openCount = active.filter((t) => t.status === "Open").length;
  const inProgressCount = active.filter((t) => t.status === "In Progress").length;
  const ownerless = active.filter((t) => t.status === "Open" && !t.assigned_to).reverse();
  const overdueCount = slaHours.enabled ? active.filter((t) => isOverdue(t, slaHours)).length : null;
  const atRiskCount = active.filter((t) => isAtRisk(t, slaHours)).length;
  const createdToday = tickets.filter((t) => t.created_at >= today).length;
  // A ticket closed, reopened and closed again on the same day counts once.
  const resolvedToday = new Set(closures.filter((c) => c.created_at >= today).map((c) => c.ticket_id)).size;

  const trend: TrendDay[] = Array.from({ length: TREND_DAYS }, (_, i) => {
    const day = new Date(trendStart.getTime() + i * DAY_MS);
    return { key: dayKey(day), label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), created: 0, resolved: 0 };
  });
  const byKey = new Map(trend.map((d) => [d.key, d]));
  for (const t of tickets) {
    const d = byKey.get(dayKey(t.created_at));
    if (d) d.created += 1;
  }
  const resolvedPerDay = new Map<string, Set<number>>();
  for (const c of closures) {
    const key = dayKey(c.created_at);
    if (!byKey.has(key)) continue;
    if (!resolvedPerDay.has(key)) resolvedPerDay.set(key, new Set());
    resolvedPerDay.get(key)!.add(c.ticket_id);
  }
  for (const [key, ids] of resolvedPerDay) byKey.get(key)!.resolved = ids.size;
  const trendIn = trend.reduce((n, d) => n + d.created, 0);
  const trendOut = trend.reduce((n, d) => n + d.resolved, 0);

  // SLA: each ticket's latest closure in the window, measured from when it was raised.
  const latestClosure = new Map<number, (typeof closures)[number]>();
  for (const c of closures) if (!latestClosure.has(c.ticket_id)) latestClosure.set(c.ticket_id, c);
  const slaSample = [...latestClosure.values()];
  const metSla = slaSample.filter(
    (c) => c.created_at.getTime() - c.tickets.created_at.getTime() <= slaTargetHours(c.tickets.priority, slaHours) * 3600_000,
  ).length;
  const slaMetPct = slaSample.length > 0 ? Math.round((metSla / slaSample.length) * 100) : null;

  const priorityCounts = ["High", "Normal", "Low"].map((p) => ({ label: p, value: active.filter((t) => t.priority === p).length }));
  const load = countBy(active, (t) => t.assigned_to).slice(0, 6);
  const loadMax = Math.max(1, ...load.map(([, n]) => n));
  // A quiet month falls back to all-time counts, and the tile's label says which it is showing.
  const recentCategories = countBy(tickets.filter((t) => t.created_at >= windowStart), (t) => t.category);
  const categoriesAllTime = recentCategories.length === 0;
  const categories = (categoriesAllTime ? countBy(tickets, (t) => t.category) : recentCategories).slice(0, 8);
  const latest = tickets.slice(0, 6);
  const mine = session
    ? active
        .filter((t) => t.assigned_to === session.name)
        .map((t) => ({ ...t, due: slaDueAt(t, slaHours) }))
        .sort((a, b) => (a.due?.getTime() ?? a.created_at.getTime()) - (b.due?.getTime() ?? b.created_at.getTime()))
    : [];

  const flow =
    createdToday === 0 && resolvedToday === 0
      ? "Quiet so far today."
      : resolvedToday >= createdToday
        ? "Closing tickets as fast as they arrive."
        : `${createdToday - resolvedToday} more came in than went out.`;
  const dateLine = new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const summary = [
    `${active.length} open`,
    overdueCount !== null ? `${overdueCount} overdue` : null,
    `${resolvedToday} resolved today`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    // data-sidebar-flip: these cards animate their own move when the sidebar toggles (see SidebarFlip).
    <div data-sidebar-flip="" className="flex flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <FlipBlock className="flex flex-col gap-[2px]">
          <p className="text-[13px] text-muted-2">{dateLine}</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Support desk</h1>
          <p className="text-[13px] text-muted tabular-nums">{summary}</p>
        </FlipBlock>
        <div className="flex items-center gap-[8px]">
          {permissions?.viewReports && <ButtonLink href="/admin/reports" label="Reports" icon={BarChart3} variant="quiet" />}
          <ButtonLink href="/admin/tickets" label="All tickets" icon={Inbox} />
        </div>
      </div>

      <div className="columns-[300px] gap-[16px]">
        <Tile title="Open queue" meta="Everything not yet closed" href="/admin/tickets" tone="ink">
          <div className="flex items-end gap-[10px]">
            <span className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{active.length}</span>
            <span className="pb-[6px] text-[13px] text-nav-text/70">{active.length === 1 ? "ticket" : "tickets"}</span>
          </div>
          <div className="mt-[16px]">
            <SegmentBar
              height={8}
              segments={[
                { label: "Open", value: openCount, className: "bg-blue" },
                { label: "In progress", value: inProgressCount, className: "bg-primary-light" },
              ]}
            />
          </div>
          <div className="mt-[10px] flex gap-[16px] text-[12px]">
            <Link href="/admin/tickets?status=Open" className="inline-flex items-center gap-[6px] text-nav-text/80 hover:text-white">
              <span className="h-[7px] w-[7px] rounded-full bg-blue" />
              Open <span className="font-semibold text-white tabular-nums">{openCount}</span>
            </Link>
            <Link
              href={`/admin/tickets?status=${encodeURIComponent("In Progress")}`}
              className="inline-flex items-center gap-[6px] text-nav-text/80 hover:text-white"
            >
              <span className="h-[7px] w-[7px] rounded-full bg-primary-light" />
              In progress <span className="font-semibold text-white tabular-nums">{inProgressCount}</span>
            </Link>
          </div>
          <div className="mt-[16px] flex flex-wrap gap-[6px] border-t border-white/10 pt-[14px]">
            <Link
              href="/admin/tickets?status=Open&assignee=Unassigned"
              className="inline-flex h-[26px] items-center gap-[6px] rounded-full bg-white/10 px-[10px] text-[12px] transition-colors hover:bg-white/20"
            >
              Unassigned <span className="font-semibold tabular-nums">{ownerless.length}</span>
            </Link>
            {overdueCount !== null && (
              <Link
                href="/admin/tickets?overdue=1"
                className={`inline-flex h-[26px] items-center gap-[6px] rounded-full px-[10px] text-[12px] transition-colors ${
                  overdueCount > 0 ? "bg-rose/25 text-white hover:bg-rose/40" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Overdue <span className="font-semibold tabular-nums">{overdueCount}</span>
              </Link>
            )}
            {atRiskCount > 0 && (
              <span className="inline-flex h-[26px] items-center gap-[6px] rounded-full bg-white/10 px-[10px] text-[12px]">
                At risk <span className="font-semibold tabular-nums">{atRiskCount}</span>
              </span>
            )}
          </div>
        </Tile>

        <Tile title="Today" meta={flow} tone="soft">
          <div className="grid grid-cols-2 gap-[12px]">
            <div className="flex flex-col">
              <span className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{createdToday}</span>
              <span className="mt-[6px] inline-flex items-center gap-[6px] text-[12px] text-muted">
                <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                came in
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{resolvedToday}</span>
              <span className="mt-[6px] inline-flex items-center gap-[6px] text-[12px] text-muted">
                <span className="h-[7px] w-[7px] rounded-full bg-lime" />
                resolved
              </span>
            </div>
          </div>
        </Tile>

        <Tile
          title={`Last ${TREND_DAYS} days`}
          meta={`${trendIn} in · ${trendOut} out`}
          href={permissions?.viewReports ? "/admin/reports" : undefined}
        >
          {trendIn + trendOut === 0 ? (
            <Quiet>Nothing came in or went out in the last {TREND_DAYS} days.</Quiet>
          ) : (
            <>
              <MirrorBars days={trend} />
              <div className="mt-[8px] flex gap-[14px] text-[12px] text-muted-2">
                <span className="inline-flex items-center gap-[6px]">
                  <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                  Created
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <span className="h-[7px] w-[7px] rounded-full bg-lime-bright" />
                  Resolved
                </span>
              </div>
            </>
          )}
        </Tile>

        <Tile
          title="Needs an owner"
          meta={ownerless.length === 0 ? undefined : `${ownerless.length} waiting, oldest first`}
          href="/admin/tickets?status=Open&assignee=Unassigned"
        >
          {ownerless.length === 0 ? (
            <Quiet>Every open ticket has someone on it.</Quiet>
          ) : (
            <ul className="-mx-[8px] flex flex-col">
              {ownerless.slice(0, 5).map((t) => (
                <li key={t.ticket_number}>
                  <Link
                    href={`/admin/tickets/${t.ticket_number}`}
                    className={`${WIPE} flex items-center gap-[10px] rounded-[10px] px-[8px] py-[7px] before:bg-surface-2`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{t.subject}</span>
                      <span className="block truncate text-[12px] text-muted-2">{t.category}</span>
                    </span>
                    <PriorityBadge priority={t.priority} />
                    <span className="w-[28px] text-right text-[12px] text-muted-2 tabular-nums">{age(t.created_at, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile title="Latest tickets" href="/admin/tickets">
          {latest.length === 0 ? (
            <Quiet>No tickets yet. New ones land here first.</Quiet>
          ) : (
            <ul className="-mx-[8px] flex flex-col">
              {latest.map((t) => (
                <li key={t.ticket_number}>
                  <Link
                    href={`/admin/tickets/${t.ticket_number}`}
                    className={`${WIPE} flex items-center gap-[10px] rounded-[10px] px-[8px] py-[7px] before:bg-surface-2`}
                  >
                    <Avatar name={t.name} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{t.subject}</span>
                      <span className="block truncate text-[12px] text-muted-2">
                        {t.name} · {age(t.created_at, now)} ago
                      </span>
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile title="Open work by priority" meta={`${active.length} not closed`}>
          <SegmentBar segments={priorityCounts.map((p) => ({ ...p, className: PRIORITY_SEGMENT[p.label] }))} />
          <dl className="mt-[14px] grid grid-cols-3 gap-[8px]">
            {priorityCounts.map((p) => (
              <div key={p.label} className="flex flex-col gap-[2px]">
                <dt className="inline-flex items-center gap-[6px] text-[12px] text-muted-2">
                  <span className={`h-[7px] w-[7px] rounded-full ${PRIORITY_SEGMENT[p.label]}`} />
                  {p.label}
                </dt>
                <dd className="text-[18px] font-semibold text-ink tabular-nums">{p.value}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile title="SLA" meta={slaHours.enabled ? `Resolved within target, last ${WINDOW_DAYS} days` : "Tracking is off"}>
          {slaHours.enabled ? (
            <>
              <div className="flex items-end gap-[8px]">
                <span className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
                  {slaMetPct === null ? "—" : `${slaMetPct}%`}
                </span>
                <span className="pb-[3px] text-[12px] text-muted-2 tabular-nums">
                  {slaSample.length === 0 ? "nothing closed yet" : `${metSla} of ${slaSample.length}`}
                </span>
              </div>
              <div className="mt-[14px]">
                <SegmentBar
                  segments={[
                    { label: "On track", value: active.length - atRiskCount - (overdueCount ?? 0), className: "bg-lime-bright" },
                    { label: "At risk", value: atRiskCount, className: "bg-amber-solid" },
                    { label: "Overdue", value: overdueCount ?? 0, className: "bg-rose" },
                  ]}
                />
                <p className="mt-[8px] text-[12px] text-muted-2 tabular-nums">
                  Open now: {active.length - atRiskCount - (overdueCount ?? 0)} on track · {atRiskCount} at risk · {overdueCount} overdue
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-[8px]">
              <p className="text-[13px] text-muted-2">With no reply targets set, there&apos;s nothing to measure tickets against.</p>
              {permissions?.manageSla && (
                <Link href="/admin/settings" className="text-[13px] font-medium text-primary underline-offset-4 hover:underline">
                  Set targets in System settings
                </Link>
              )}
            </div>
          )}
        </Tile>

        <Tile title="Who's carrying what" meta="Open tickets per person">
          {load.length === 0 ? (
            <Quiet>No one has open tickets assigned.</Quiet>
          ) : (
            <ul className="-mx-[8px] flex flex-col">
              {load.map(([name, count]) => (
                <li key={name}>
                  <Link
                    href={`/admin/tickets?assignee=${encodeURIComponent(name)}`}
                    className={`${WIPE} grid grid-cols-[26px_minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-[10px] rounded-[10px] px-[8px] py-[6px] before:bg-surface-2`}
                  >
                    <Avatar name={name} size={26} />
                    <span className="truncate text-[13px] text-ink">{name}</span>
                    <span className="h-[6px] rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${(count / loadMax) * 100}%` }} />
                    </span>
                    <span className="text-right text-[13px] font-semibold text-ink tabular-nums">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile
          title="What's breaking"
          meta={categoriesAllTime ? `Top categories, all time (none in the last ${WINDOW_DAYS} days)` : `Top categories, last ${WINDOW_DAYS} days`}
        >
          {categories.length === 0 ? (
            <Quiet>No tickets yet.</Quiet>
          ) : (
            <div className="flex flex-wrap gap-[6px]">
              {categories.map(([name, count]) => (
                <Link
                  key={name}
                  href={`/admin/tickets?category=${encodeURIComponent(name)}`}
                  className="inline-flex h-[28px] items-center gap-[8px] rounded-full border border-card-border px-[12px] text-[12px] text-ink transition-colors duration-200 hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                >
                  {name}
                  <span className="font-semibold tabular-nums text-muted-2">{count}</span>
                </Link>
              ))}
            </div>
          )}
        </Tile>

        <Tile
          title="On your plate"
          meta={mine.length === 0 ? undefined : `${mine.length} assigned to you`}
          href={session ? `/admin/tickets?assignee=${encodeURIComponent(session.name)}` : undefined}
        >
          {mine.length === 0 ? (
            <Quiet>Nothing assigned to you right now.</Quiet>
          ) : (
            <ul className="-mx-[8px] flex flex-col">
              {mine.slice(0, 5).map((t) => {
                const due = t.due ? dueLabel(t.due, now) : null;
                return (
                  <li key={t.ticket_number}>
                    <Link
                      href={`/admin/tickets/${t.ticket_number}`}
                      className={`${WIPE} flex items-center gap-[10px] rounded-[10px] px-[8px] py-[7px] before:bg-surface-2`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{t.subject}</span>
                        <span className="block font-mono-plex text-[11px] text-muted-2">{t.ticket_number}</span>
                      </span>
                      <span
                        className={`whitespace-nowrap text-[12px] tabular-nums ${due?.late ? "font-medium text-rose-text" : "text-muted-2"}`}
                      >
                        {due ? due.text : `${age(t.created_at, now)} old`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tile>
      </div>
    </div>
  );
}
