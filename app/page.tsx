import Link from "next/link";
import { ArrowRight, ArrowUpRight, Paperclip } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";
import { formatDuration, getAvgResolutionHours } from "@/app/lib/reportsData";
import { PriorityBadge, StatusDot } from "@/app/components/TicketBadges";
import TicketLookup from "@/app/components/home/TicketLookup";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

/** The request's clock, kept out of the component body so render stays pure. */
function weekAgo(): Date {
  return new Date(Date.now() - WEEK_MS);
}

/** Midnight of each of the last 14 days, oldest first, in the server's time zone like every other date label. */
function chartDays(): Date[] {
  const now = new Date();
  return Array.from({ length: CHART_DAYS }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (CHART_DAYS - 1 - i)));
}

type DayCount = { label: string; count: number; today: boolean };

/** New tickets per day: one small query for the window, bucketed here. */
async function getDailyCounts(): Promise<DayCount[]> {
  const days = chartDays();
  const rows = await prisma.tickets.findMany({ where: { created_at: { gte: days[0] } }, select: { created_at: true } });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.created_at.toDateString(), (counts.get(r.created_at.toDateString()) ?? 0) + 1);
  return days.map((d, i) => ({
    label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    count: counts.get(d.toDateString()) ?? 0,
    today: i === days.length - 1,
  }));
}

/** Staggers the one-time entrance of each block (see .home-rise in globals.css). */
function delay(ms: number): React.CSSProperties {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}

const STEPS = [
  { status: "Open", title: "You describe it", body: "Say what's wrong in your own words and attach a screenshot if it helps." },
  { status: "In Progress", title: "IT picks it up", body: "Boboi routes it to the right team, and a technician replies on the ticket." },
  { status: "Closed", title: "It gets fixed", body: "Follow every update with your ticket ID, then rate the fix when it's closed." },
] as const;

export default async function Home() {
  const [session, openNow, closedThisWeek, avgResolution, daily] = await Promise.all([
    getIamsSession(),
    prisma.tickets.count({ where: { status: { not: "Closed" } } }),
    prisma.ticket_events
      .findMany({
        where: { event_type: "status", to_value: "Closed", created_at: { gte: weekAgo() } },
        distinct: ["ticket_id"],
        select: { ticket_id: true },
      })
      .then((rows) => rows.length),
    getAvgResolutionHours(),
    getDailyCounts(),
  ]);
  const adminHref = session ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/admin` : iamsLoginUrl();
  const adminLabel = session ? "Go to the admin dashboard" : "Administrator login";

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[16px] px-[16px] pb-[48px] pt-[36px] md:px-[32px] md:pt-[56px]">
      {/* Hero: what this is, the two things people come here to do, and a live look at the flow. */}
      <section className="grid items-center gap-[28px] pb-[20px] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-[48px]">
        <div className="flex flex-col items-start">
          <h1 className="home-rise text-[30px] font-semibold leading-[36px] tracking-[-0.03em] text-ink" style={delay(0)}>
            Something broken?
            <br />
            <span className="text-muted-2">Tell IT, then track the fix.</span>
          </h1>

          <p className="home-rise mt-[12px] max-w-[440px] text-[13px] leading-[21px] text-muted" style={delay(80)}>
            Raise hardware, software, network and account requests with the PHN IT Department, and follow every ticket
            until it&apos;s closed.
          </p>

          <div className="home-rise mt-[20px] flex flex-wrap gap-[8px]" style={delay(140)}>
            <Link
              href="/submit"
              className="group inline-flex h-[36px] items-center gap-[8px] rounded-[9px] bg-primary px-[14px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Submit a ticket
              <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-[2px]" />
            </Link>
            <Link
              href="/tickets"
              className="inline-flex h-[36px] items-center rounded-[9px] border border-field-border bg-surface px-[14px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
            >
              View my tickets
            </Link>
          </div>
        </div>

        <ComposerPreview />
      </section>

      {/* Find a ticket you already raised, and how the desk is doing right now. */}
      <section className="grid gap-[16px] md:grid-cols-2">
        <div className="home-rise flex flex-col gap-[14px] rounded-[16px] border border-card-border/60 bg-surface p-[20px]" style={delay(260)}>
          <div className="flex flex-col gap-[2px]">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Already raised one?</h2>
            <p className="text-[13px] text-muted-2">Open it with its ID to see the status and any replies from IT.</p>
          </div>
          <TicketLookup />
          <p className="mt-auto border-t border-card-border/60 pt-[12px] text-[12px] leading-[18px] text-muted-2">
            Your ticket ID appears on screen as soon as you submit. Keep it to check on the ticket or add more details later.
          </p>
        </div>

        <div className="home-rise flex flex-col justify-between gap-[16px] rounded-[16px] border border-card-border/60 bg-surface p-[20px]" style={delay(320)}>
          <div className="flex flex-col gap-[2px]">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">The desk right now</h2>
            <p className="text-[13px] text-muted-2">Live from the ticket queue.</p>
          </div>
          <DailyChart days={daily} />
          <div className="grid grid-cols-3 divide-x divide-card-border/70">
            <Stat label="In the queue" value={String(openNow)} />
            <Stat label="Closed this week" value={String(closedThisWeek)} />
            <Stat
              label="Average time to close"
              value={avgResolution.avgHours === null ? "–" : formatDuration(avgResolution.avgHours)}
            />
          </div>
        </div>
      </section>

      {/* How a ticket moves, in the same status names people will see on their ticket. */}
      <section className="home-rise rounded-[16px] border border-card-border/60 bg-surface p-[20px]" style={delay(380)}>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">How a ticket moves</h2>
        <ol className="mt-[16px] grid gap-[16px] md:grid-cols-3 md:gap-[24px]">
          {STEPS.map((s, i) => (
            <li key={s.status} className="relative flex flex-col gap-[6px]">
              <div className="flex items-center gap-[10px]">
                <span className="inline-flex h-[24px] shrink-0 items-center gap-[6px] rounded-full bg-surface-2 px-[9px] text-[12px] font-medium text-ink">
                  <StatusDot status={s.status} />
                  {s.status}
                </span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-card-border md:block" aria-hidden="true" />}
              </div>
              <h3 className="mt-[4px] text-[13px] font-semibold text-ink">{s.title}</h3>
              <p className="text-[13px] leading-[20px] text-muted-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* For IT staff. */}
      <section
        className="home-rise flex flex-wrap items-center justify-between gap-[12px] rounded-[16px] border border-card-border/60 bg-surface-2/50 px-[20px] py-[14px]"
        style={delay(440)}
      >
        <p className="text-[13px] text-muted">
          <span className="font-medium text-ink">IT staff?</span> Assign, reply to and close tickets from the admin console.
        </p>
        <a
          href={adminHref}
          className="group inline-flex h-[32px] items-center gap-[6px] rounded-[8px] px-[10px] text-[13px] font-medium text-ink transition-colors hover:bg-surface"
        >
          {adminLabel}
          <ArrowUpRight
            size={14}
            strokeWidth={2}
            className="transition-transform duration-200 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]"
          />
        </a>
      </section>
    </main>
  );
}

/** Two weeks of new tickets as small bars; today is the solid one. */
function DailyChart({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-baseline justify-between gap-[12px] text-[12px] text-muted-2">
        <span>New tickets per day</span>
        <span className="tabular-nums">
          <span className="font-medium text-ink">{total}</span> in {days.length} days
        </span>
      </div>
      <div
        role="img"
        aria-label={`New tickets per day, last ${days.length} days: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}
        className="flex h-[52px] items-end gap-[4px]"
      >
        {days.map((d, i) => (
          <span key={d.label} title={`${d.label}: ${d.count} new`} className="flex h-full flex-1 items-end">
            <span
              className={`grow-y block w-full rounded-[3px] ${d.count === 0 ? "bg-card-border" : d.today ? "bg-primary" : "bg-primary/35"}`}
              style={{
                height: d.count === 0 ? 3 : `${Math.max(10, (d.count / max) * 100)}%`,
                animationDelay: `${450 + i * 30}ms`,
              }}
            />
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-faint">
        <span>{days[0]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[2px] px-[12px] first:pl-0 last:pr-0">
      <span className="text-[22px] font-semibold leading-[28px] tracking-[-0.02em] tabular-nums text-ink">{value}</span>
      <span className="text-[12px] leading-[16px] text-muted-2">{label}</span>
    </div>
  );
}

/**
 * A dark, one-time animated preview of a ticket being written: the issue types itself in, Boboi
 * suggests a category, team and priority, and the status track fills. Purely illustrative, so it's
 * hidden from screen readers; the steps section below says the same thing in words.
 */
function ComposerPreview() {
  return (
    <div className="home-rise tile-ink relative overflow-hidden rounded-[18px] p-[18px] shadow-pop" style={delay(200)} aria-hidden="true">
      <div className="flex items-center justify-between gap-[12px] text-[12px] text-muted-2">
        <span className="font-medium text-ink">New ticket</span>
        <span className="tabular-nums">TCK-7K3F-9Q2M</span>
      </div>

      <div className="mt-[14px] rounded-[12px] border border-white/10 bg-white/[0.04] p-[12px]">
        <span className="text-[11px] text-muted-2">What&apos;s wrong?</span>
        <div className="mt-[4px] flex items-center text-[14px] leading-[22px] text-ink">
          <span className="home-type whitespace-nowrap">Laptop can&apos;t connect to the office Wi-Fi</span>
          <span className="home-caret ml-[2px] inline-block h-[16px] w-[2px] rounded-full bg-primary-light" />
        </div>
        <div className="mt-[10px] flex items-center gap-[6px] text-[11px] text-muted-2">
          <Paperclip size={12} strokeWidth={1.75} />
          wifi-error.png
        </div>
      </div>

      <div className="home-rise mt-[12px] flex flex-col gap-[8px]" style={delay(2400)}>
        <span className="text-[11px] text-muted-2">Boboi suggests</span>
        <div className="flex flex-wrap items-center gap-[6px]">
          <span className="inline-flex h-[24px] items-center rounded-full bg-white/10 px-[9px] text-[12px] text-ink">Admin - Network</span>
          <span className="inline-flex h-[24px] items-center gap-[6px] rounded-full bg-white/10 px-[9px] text-[12px] text-ink">
            <span className="h-[6px] w-[6px] rounded-full bg-chart-pink" />
            Admin team
          </span>
          <PriorityBadge priority="Normal" />
        </div>
      </div>

      <div className="home-rise mt-[16px]" style={delay(2900)}>
        <div className="relative h-[4px] overflow-hidden rounded-full bg-white/10">
          <span className="grow-x absolute inset-y-0 left-0 w-1/2 rounded-full bg-lime-bright" style={{ animationDelay: "3100ms" }} />
        </div>
        <div className="mt-[8px] flex justify-between text-[11px]">
          <span className="text-ink">Open</span>
          <span className="text-ink">In Progress</span>
          <span className="text-muted-2">Closed</span>
        </div>
      </div>
    </div>
  );
}
