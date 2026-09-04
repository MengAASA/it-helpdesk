import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { notifyNewReply } from "@/app/lib/notifications";

export async function POST(
  req: Request,
  { params }: RouteContext<"/api/admin/tickets/[ticketNumber]/notes">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageTickets) {
    return NextResponse.json({ error: "You don't have permission to manage tickets" }, { status: 403 });
  }

  const { ticketNumber } = await params;
  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const isPublic = body.isPublic === true;
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { id: true, name: true, email: true, subject: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const result = await prisma.ticket_notes.create({
    data: {
      ticket_id: ticket.id,
      author_name: session.name,
      author_email: session.email,
      message,
      is_public: isPublic,
    },
  });

  if (isPublic) {
    await notifyNewReply({
      ticketNumber,
      subject: ticket.subject,
      requesterEmail: ticket.email,
      requesterName: ticket.name,
      message,
    });
  }

  return NextResponse.json({
    id: result.id,
    authorName: session.name,
    authorEmail: session.email,
    message,
    isPublic,
    createdAt: new Date().toISOString(),
  });
}
