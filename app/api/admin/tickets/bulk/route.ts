import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor, getCachedEmailByName } from "@/app/lib/permissions";
import { notifyStatusChanged, notifyTicketAssigned } from "@/app/lib/notifications";

const ALLOWED_STATUSES = ["Open", "In Progress", "Closed"];
const MAX_BULK_SIZE = 100;

type BulkEvent = {
  ticketId: number;
  ticketNumber: string;
  type: "status" | "assignment";
  from: string | null;
  to: string | null;
  subject: string;
  email: string;
  name: string;
};

export async function PATCH(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageTickets) {
    return NextResponse.json({ error: "You don't have permission to manage tickets" }, { status: 403 });
  }

  const body = await req.json();

  if (!Array.isArray(body.ticketNumbers) || body.ticketNumbers.some((t: unknown) => typeof t !== "string" || !t)) {
    return NextResponse.json({ error: "ticketNumbers must be a non-empty array" }, { status: 400 });
  }
  const ticketNumbers = Array.from(new Set(body.ticketNumbers as string[]));
  if (ticketNumbers.length === 0) {
    return NextResponse.json({ error: "No tickets selected" }, { status: 400 });
  }
  if (ticketNumbers.length > MAX_BULK_SIZE) {
    return NextResponse.json(
      { error: `Too many tickets selected (max ${MAX_BULK_SIZE} per request)` },
      { status: 400 }
    );
  }

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

  const existingRows = await prisma.tickets.findMany({
    where: { ticket_number: { in: ticketNumbers } },
    select: { id: true, ticket_number: true, status: true, assigned_to: true, name: true, email: true, subject: true },
  });

  const foundNumbers = new Set(existingRows.map((r) => r.ticket_number));
  const notFound = ticketNumbers.filter((tn) => !foundNumbers.has(tn));

  if (existingRows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, notFound });
  }

  await prisma.tickets.updateMany({
    where: { ticket_number: { in: existingRows.map((r) => r.ticket_number) } },
    data,
  });

  const events: BulkEvent[] = [];
  for (const row of existingRows) {
    if (typeof body.status === "string" && body.status !== row.status) {
      events.push({
        ticketId: row.id,
        ticketNumber: row.ticket_number,
        type: "status",
        from: row.status,
        to: body.status,
        subject: row.subject,
        email: row.email,
        name: row.name,
      });
    }
    if (typeof body.assignedTo === "string") {
      const nextAssignee = body.assignedTo.trim() || null;
      if (nextAssignee !== row.assigned_to) {
        events.push({
          ticketId: row.id,
          ticketNumber: row.ticket_number,
          type: "assignment",
          from: row.assigned_to,
          to: nextAssignee,
          subject: row.subject,
          email: row.email,
          name: row.name,
        });
      }
    }
  }

  if (events.length > 0) {
    await prisma.ticket_events.createMany({
      data: events.map((e) => ({
        ticket_id: e.ticketId,
        event_type: e.type,
        from_value: e.from,
        to_value: e.to,
        actor_name: session.name,
      })),
    });
  }

  for (const e of events) {
    if (e.type === "status") {
      await notifyStatusChanged({
        ticketNumber: e.ticketNumber,
        subject: e.subject,
        requesterEmail: e.email,
        requesterName: e.name,
        status: e.to ?? "",
      });
    }
  }

  if (typeof body.assignedTo === "string") {
    const nextAssignee = body.assignedTo.trim() || null;
    if (nextAssignee) {
      const assigneeEmail = await getCachedEmailByName(nextAssignee);
      for (const e of events) {
        if (e.type === "assignment" && e.to) {
          await notifyTicketAssigned({
            ticketNumber: e.ticketNumber,
            subject: e.subject,
            assigneeEmail,
            assigneeName: e.to,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, updated: existingRows.length, notFound });
}
