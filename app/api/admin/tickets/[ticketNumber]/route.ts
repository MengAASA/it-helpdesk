import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor, getCachedEmailByName } from "@/app/lib/permissions";
import { notifyStatusChanged, notifyTicketAssigned } from "@/app/lib/notifications";

const ALLOWED_STATUSES = ["Open", "In Progress", "Closed"];

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/tickets/[ticketNumber]">
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

  const data: { status?: string; assigned_to?: string | null } = {};

  if (typeof body.status === "string") {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (typeof body.assignedTo === "string") {
    data.assigned_to = body.assignedTo.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { id: true, status: true, assigned_to: true, name: true, email: true, subject: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  await prisma.tickets.update({ where: { ticket_number: ticketNumber }, data });

  const events: { type: string; from: string | null; to: string | null }[] = [];
  if (typeof body.status === "string" && body.status !== existing.status) {
    events.push({ type: "status", from: existing.status, to: body.status });
  }
  if (typeof body.assignedTo === "string") {
    const nextAssignee = body.assignedTo.trim() || null;
    if (nextAssignee !== existing.assigned_to) {
      events.push({ type: "assignment", from: existing.assigned_to, to: nextAssignee });
    }
  }
  for (const event of events) {
    await prisma.ticket_events.create({
      data: {
        ticket_id: existing.id,
        event_type: event.type,
        from_value: event.from,
        to_value: event.to,
        actor_name: session.name,
      },
    });
  }

  for (const event of events) {
    if (event.type === "status") {
      await notifyStatusChanged({
        ticketNumber,
        subject: existing.subject,
        requesterEmail: existing.email,
        requesterName: existing.name,
        status: event.to ?? "",
      });
    }
    if (event.type === "assignment" && event.to) {
      const assigneeEmail = await getCachedEmailByName(event.to);
      await notifyTicketAssigned({
        ticketNumber,
        subject: existing.subject,
        assigneeEmail,
        assigneeName: event.to,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
