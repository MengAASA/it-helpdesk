import { prisma } from "@/app/lib/db";
import { isOverdue } from "@/app/lib/sla";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getCachedEmailByName } from "@/app/lib/permissions";
import { getTeamMembers } from "@/app/lib/roundRobin";
import { notifySlaBreach } from "@/app/lib/notifications";

const SLA_BREACH_EVENT = "sla_breach";

export type SlaBreachCheckResult = { checked: number; notified: number; skipped: "sla_disabled" | null };

/**
 * Finds tickets that are overdue and haven't already triggered a breach notification
 * (tracked via a `ticket_events` row, so a ticket is only ever notified once per breach),
 * emails whoever is responsible for it — the assignee, or the whole team if unassigned —
 * and records the attempt either way.
 */
export async function runSlaBreachCheck(): Promise<SlaBreachCheckResult> {
  const slaHours = await getSlaHours();
  if (!slaHours.enabled) {
    return { checked: 0, notified: 0, skipped: "sla_disabled" };
  }

  const openTickets = await prisma.tickets.findMany({
    where: { status: { not: "Closed" } },
    select: {
      id: true,
      ticket_number: true,
      subject: true,
      team: true,
      priority: true,
      status: true,
      created_at: true,
      assigned_to: true,
    },
  });

  const overdueTickets = openTickets.filter((t) => isOverdue(t, slaHours));

  let notified = 0;
  for (const ticket of overdueTickets) {
    const alreadyNotified = await prisma.ticket_events.findFirst({
      where: { ticket_id: ticket.id, event_type: SLA_BREACH_EVENT },
      select: { id: true },
    });
    if (alreadyNotified) continue;

    const recipients = ticket.assigned_to
      ? [{ name: ticket.assigned_to, email: await getCachedEmailByName(ticket.assigned_to) }]
      : await getTeamMembers(ticket.team);
    const emails: { name: string; email: string }[] = [];
    for (const r of recipients) {
      if (r.email) emails.push({ name: r.name, email: r.email });
    }

    if (emails.length === 0) {
      // Nobody to notify at all — that's a data problem (no email on file), not a
      // transient failure, so there's no point retrying this ticket every run.
      await prisma.ticket_events.create({
        data: {
          ticket_id: ticket.id,
          event_type: SLA_BREACH_EVENT,
          from_value: null,
          to_value: "no_recipient",
          actor_name: "System",
        },
      });
      continue;
    }

    let anySucceeded = false;
    for (const r of emails) {
      const sent = await notifySlaBreach({
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        recipientEmail: r.email,
        recipientName: r.name,
      });
      if (sent) anySucceeded = true;
    }

    // Only record — and stop retrying — once a send genuinely went out. If email is
    // disabled, misconfigured, or the SMTP server is down, leave this ticket unmarked
    // so the next run tries again instead of silently giving up forever.
    if (anySucceeded) {
      await prisma.ticket_events.create({
        data: {
          ticket_id: ticket.id,
          event_type: SLA_BREACH_EVENT,
          from_value: null,
          to_value: "notified",
          actor_name: "System",
        },
      });
      notified++;
    }
  }

  return { checked: overdueTickets.length, notified, skipped: null };
}
