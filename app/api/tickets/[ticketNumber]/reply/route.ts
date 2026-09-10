import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/app/lib/db";
import { getCachedEmailByName } from "@/app/lib/permissions";
import { notifyRequesterReply } from "@/app/lib/notifications";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: RouteContext<"/api/tickets/[ticketNumber]/reply">
) {
  const { ticketNumber } = await params;
  const form = await req.formData();

  const message = String(form.get("message") ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const files = form.getAll("attachments").filter((f): f is File => f instanceof File);
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} attachments allowed` }, { status: 400 });
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `"${file.name}" exceeds 5MB` }, { status: 400 });
    }
  }

  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { id: true, name: true, email: true, subject: true, status: true, assigned_to: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status === "Closed") {
    return NextResponse.json(
      { error: "This ticket is closed. Reopen it to add a reply." },
      { status: 400 }
    );
  }

  const ticketDir = path.join(UPLOADS_DIR, ticketNumber);
  if (files.length > 0) await mkdir(ticketDir, { recursive: true });

  const savedAttachments: { filename: string; size: number; mimeType: string; storedPath: string }[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedPath = path.join(ticketDir, `${Date.now()}-${safeName}`);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(storedPath, bytes);
    savedAttachments.push({
      filename: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      storedPath,
    });
  }

  const result = await prisma.ticket_notes.create({
    data: {
      ticket_id: ticket.id,
      author_name: ticket.name,
      author_email: ticket.email,
      message,
      is_public: true,
    },
  });

  for (const a of savedAttachments) {
    await prisma.attachments.create({
      data: {
        ticket_id: ticket.id,
        filename: a.filename,
        size: a.size,
        mime_type: a.mimeType,
        stored_path: a.storedPath,
      },
    });
  }

  if (ticket.assigned_to) {
    const assigneeEmail = await getCachedEmailByName(ticket.assigned_to);
    await notifyRequesterReply({
      ticketNumber,
      subject: ticket.subject,
      assigneeEmail,
      assigneeName: ticket.assigned_to,
      requesterName: ticket.name,
      message,
    });
  }

  return NextResponse.json({
    id: result.id,
    authorName: ticket.name,
    authorEmail: ticket.email,
    message,
    createdAt: new Date().toISOString(),
  });
}
