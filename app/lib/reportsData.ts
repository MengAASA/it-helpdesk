import { prisma } from "@/app/lib/db";

export type CountRow = { label: string; count: number };

export async function countBy(
  column: "status" | "team" | "priority" | "category" | "department" | "location"
): Promise<CountRow[]> {
  const rows = await prisma.tickets.groupBy({
    by: [column],
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });
  return rows.map((r) => ({ label: r[column], count: r._count }));
}

export type WeekFlow = { key: string; label: string; created: number; resolved: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 of the week containing `d`, in the server's time zone (the same zone every other date label uses). */
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

/**
 * Tickets created and tickets closed in each of the last `weeks` calendar weeks, ending with the
 * current week (so quiet weeks show as real zeros, not as a window that stops at the newest
 * ticket). "Closed" counts each ticket once per week in which a status change to Closed was
 * logged; closures from before event logging existed can't be dated, so they aren't counted.
 */
export async function getWeeklyFlow(now: number, weeks = 12): Promise<WeekFlow[]> {
  const thisWeek = startOfWeek(new Date(now));
  const starts = Array.from({ length: weeks }, (_, i) => {
    const s = new Date(thisWeek);
    s.setDate(s.getDate() - (weeks - 1 - i) * 7);
    return s;
  });
  const rangeStart = starts[0];

  const [created, closures] = await Promise.all([
    prisma.tickets.findMany({ where: { created_at: { gte: rangeStart } }, select: { created_at: true } }),
    prisma.ticket_events.findMany({
      where: { event_type: "status", to_value: "Closed", created_at: { gte: rangeStart } },
      select: { ticket_id: true, created_at: true },
    }),
  ]);

  // Whole weeks since rangeStart; rounding absorbs any daylight-saving hour.
  const weekIndex = (d: Date) => Math.round((startOfWeek(d).getTime() - rangeStart.getTime()) / (7 * DAY_MS));

  const createdPerWeek = new Array<number>(weeks).fill(0);
  for (const t of created) {
    const i = weekIndex(t.created_at);
    if (i >= 0 && i < weeks) createdPerWeek[i] += 1;
  }

  const closedPerWeek = Array.from({ length: weeks }, () => new Set<number>());
  for (const e of closures) {
    const i = weekIndex(e.created_at);
    if (i >= 0 && i < weeks) closedPerWeek[i].add(e.ticket_id);
  }

  return starts.map((start, i) => ({
    key: start.toISOString(),
    label: `${start.getDate()} ${start.toLocaleDateString("en-US", { month: "short" })}`,
    created: createdPerWeek[i],
    resolved: closedPerWeek[i].size,
  }));
}

export type AgentRow = {
  name: string;
  assigned: number;
  closed: number;
  avgResolutionHours: number | null;
  csatUp: number;
  csatDown: number;
};

/**
 * Mirrors the reports page's system-wide avg-resolution logic, but bucketed by assignee so
 * both the Reports page and the CSV export can show per-agent workload, resolution speed, and
 * satisfaction from the same source of truth.
 */
export async function getAgentPerformance(): Promise<AgentRow[]> {
  const [tickets, closureEvents] = await Promise.all([
    prisma.tickets.findMany({
      select: { id: true, assigned_to: true, status: true, feedback: true, created_at: true },
    }),
    prisma.ticket_events.findMany({
      where: { event_type: "status", to_value: "Closed" },
      select: { ticket_id: true, created_at: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const closedAtByTicket = new Map<number, number>();
  for (const e of closureEvents) {
    if (!closedAtByTicket.has(e.ticket_id)) closedAtByTicket.set(e.ticket_id, e.created_at.getTime());
  }

  const byAgent = new Map<
    string,
    { assigned: number; closed: number; resolutionHours: number[]; csatUp: number; csatDown: number }
  >();

  for (const t of tickets) {
    const key = t.assigned_to?.trim() || "Unassigned";
    const bucket = byAgent.get(key) ?? { assigned: 0, closed: 0, resolutionHours: [], csatUp: 0, csatDown: 0 };
    bucket.assigned += 1;
    if (t.status === "Closed") bucket.closed += 1;
    const closedAtMs = closedAtByTicket.get(t.id);
    if (closedAtMs !== undefined) {
      const hours = (closedAtMs - t.created_at.getTime()) / (1000 * 60 * 60);
      if (hours >= 0) bucket.resolutionHours.push(hours);
    }
    if (t.feedback === "up") bucket.csatUp += 1;
    if (t.feedback === "down") bucket.csatDown += 1;
    byAgent.set(key, bucket);
  }

  return Array.from(byAgent.entries())
    .map(([name, b]) => ({
      name,
      assigned: b.assigned,
      closed: b.closed,
      avgResolutionHours:
        b.resolutionHours.length > 0
          ? b.resolutionHours.reduce((a, c) => a + c, 0) / b.resolutionHours.length
          : null,
      csatUp: b.csatUp,
      csatDown: b.csatDown,
    }))
    .sort((a, b) => b.assigned - a.assigned);
}
