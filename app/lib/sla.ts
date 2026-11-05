export type SlaHours = { Low: number; Normal: number; High: number; enabled: boolean };

export const DEFAULT_SLA_HOURS: SlaHours = {
  High: 24,
  Normal: 72,
  Low: 120,
  enabled: true,
};

const AT_RISK_THRESHOLD = 0.8;

type TicketLike = { status: string; priority: string; created_at: string | Date };

function targetMs(ticket: TicketLike, slaHours: SlaHours): number {
  const hours = slaHours[ticket.priority as "Low" | "Normal" | "High"] ?? slaHours.Normal;
  return hours * 60 * 60 * 1000;
}

export function isOverdue(ticket: TicketLike, slaHours: SlaHours = DEFAULT_SLA_HOURS): boolean {
  if (!slaHours.enabled) return false;
  if (ticket.status === "Closed") return false;
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  return ageMs > targetMs(ticket, slaHours);
}

/** When an open ticket's SLA target runs out, or null when SLA is off or the ticket is closed. */
export function slaDueAt(ticket: TicketLike, slaHours: SlaHours = DEFAULT_SLA_HOURS): Date | null {
  if (!slaHours.enabled || ticket.status === "Closed") return null;
  return new Date(new Date(ticket.created_at).getTime() + targetMs(ticket, slaHours));
}

/** SLA target in hours for a ticket's priority. */
export function slaTargetHours(priority: string, slaHours: SlaHours = DEFAULT_SLA_HOURS): number {
  return slaHours[priority as "Low" | "Normal" | "High"] ?? slaHours.Normal;
}

/** True once a ticket has used up most of its SLA window but hasn't breached it yet. */
export function isAtRisk(ticket: TicketLike, slaHours: SlaHours = DEFAULT_SLA_HOURS): boolean {
  if (!slaHours.enabled) return false;
  if (ticket.status === "Closed") return false;
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  const target = targetMs(ticket, slaHours);
  return ageMs > target * AT_RISK_THRESHOLD && ageMs <= target;
}
