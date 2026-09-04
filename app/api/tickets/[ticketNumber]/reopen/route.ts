import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getCachedEmailByName } from "@/app/lib/permissions";
import { notifyTicketReopened } from "@/app/lib/notifications";

export async function POST(
  req: Request,
  { params }: RouteContext<"/api/tickets/[ticketNumber]/reopen">
) {
  const { ticketNumber } = await params;

  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { id: true, status: true, name: true, subject: true, assigned_to: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "Closed") {
    return NextResponse.json({ error: "Only closed tickets can be reopened" }, { status: 400 });
  }

  await prisma.tickets.update({
    where: { id: ticket.id },
    data: { status: "Open", feedback: null, feedback_at: null },
  });
  await prisma.ticket_events.create({
    data: {
      ticket_id: ticket.id,
      event_type: "status",
      from_value: "Closed",
      to_value: "Open",
      actor_name: ticket.name,
    },
  });

  if (ticket.assigned_to) {
    const assigneeEmail = await getCachedEmailByName(ticket.assigned_to);
    await notifyTicketReopened({
      ticketNumber,
      subject: ticket.subject,
      assigneeEmail,
      assigneeName: ticket.assigned_to,
    });
  }

  return NextResponse.json({ ok: true });
}
