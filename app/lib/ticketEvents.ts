export type TicketEventLike = {
  eventType: string;
  fromValue: string | null;
  toValue: string | null;
};

export function describeEvent(e: TicketEventLike): string {
  if (e.eventType === "status") {
    return `changed status from ${e.fromValue ?? "—"} to ${e.toValue ?? "—"}`;
  }
  if (e.eventType === "assignment") {
    if (!e.fromValue) return `assigned ticket to ${e.toValue}`;
    if (!e.toValue) return `unassigned ticket (was ${e.fromValue})`;
    return `reassigned ticket from ${e.fromValue} to ${e.toValue}`;
  }
  if (e.eventType === "feedback") {
    return e.toValue === "up" ? "marked this ticket as resolved 👍" : "marked this ticket as not resolved 👎";
  }
  if (e.eventType === "priority") {
    return `changed priority from ${e.fromValue ?? "—"} to ${e.toValue ?? "—"}`;
  }
  if (e.eventType === "sla_breach") {
    return e.toValue === "notified"
      ? "sent an SLA breach notification"
      : "detected an SLA breach (no one to notify)";
  }
  return e.eventType;
}
