import { prisma } from "@/app/lib/db";

export type CountRow = { label: string; count: number };

export async function countBy(column: "status" | "team" | "priority"): Promise<CountRow[]> {
  const rows = await prisma.tickets.groupBy({
    by: [column],
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });
  return rows.map((r) => ({ label: r[column], count: r._count }));
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
