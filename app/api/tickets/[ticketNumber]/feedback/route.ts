import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function POST(
  req: Request,
  { params }: RouteContext<"/api/tickets/[ticketNumber]/feedback">
) {
  const { ticketNumber } = await params;
  const body = await req.json();
  const feedback = body.feedback;
  if (feedback !== "up" && feedback !== "down") {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { id: true, status: true, name: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "Closed") {
    return NextResponse.json({ error: "Feedback is only available once a ticket is closed" }, { status: 400 });
  }

  await prisma.tickets.update({
    where: { id: ticket.id },
    data: { feedback, feedback_at: new Date() },
  });
  await prisma.ticket_events.create({
    data: {
      ticket_id: ticket.id,
      event_type: "feedback",
      from_value: null,
      to_value: feedback,
      actor_name: ticket.name,
    },
  });

  return NextResponse.json({ ok: true });
}
