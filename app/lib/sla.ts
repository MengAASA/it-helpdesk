export type SlaHours = { Low: number; Normal: number; High: number };

export const DEFAULT_SLA_HOURS: SlaHours = {
  High: 24,
  Normal: 72,
  Low: 120,
};

export function isOverdue(
  ticket: { status: string; priority: string; created_at: string | Date },
  slaHours: SlaHours = DEFAULT_SLA_HOURS
): boolean {
  if (ticket.status === "Closed") return false;
  const hours = slaHours[ticket.priority as keyof SlaHours] ?? slaHours.Normal;
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}
