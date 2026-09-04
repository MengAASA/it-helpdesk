import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getNextRoundRobinAssignee } from "@/app/lib/roundRobin";
import { getCategories } from "@/app/lib/categoriesServer";
import { notifyTicketAssigned } from "@/app/lib/notifications";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const REQUIRED_FIELDS = [
  "category",
  "priority",
  "name",
  "email",
  "staffNo",
  "phone",
  "location",
  "department",
  "subject",
  "message",
] as const;

function generateTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `TCK-${timestamp}${random}`;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const values: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS) {
    const value = form.get(field);
    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
    values[field] = value;
  }

  const userRequestTypes = form.getAll("userRequestTypes").filter(
    (v): v is string => typeof v === "string"
  );
  if (userRequestTypes.length === 0) {
    return NextResponse.json({ error: "Missing field: userRequestTypes" }, { status: 400 });
  }

  const categories = await getCategories();
  const category = categories.find((c) => c.name === values.category);
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const team = category.team;

  const files = form.getAll("attachments").filter((f): f is File => f instanceof File);
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} attachments allowed` }, { status: 400 });
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `"${file.name}" exceeds 5MB` }, { status: 400 });
    }
  }

  const ticketNumber = generateTicketNumber();
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

  const assignee = await getNextRoundRobinAssignee(team);

  let ticketId: number;
  try {
    const created = await prisma.tickets.create({
      data: {
        ticket_number: ticketNumber,
        category: values.category,
        team,
        priority: values.priority,
        assigned_to: assignee?.name ?? null,
        name: values.name,
        email: values.email,
        staff_no: values.staffNo,
        phone: values.phone,
        location: values.location,
        department: values.department,
        user_request_types: JSON.stringify(userRequestTypes),
        subject: values.subject,
        message: values.message,
      },
      select: { id: true },
    });
    ticketId = created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Ticket number collision, please submit again" },
        { status: 409 }
      );
    }
    throw err;
  }

  for (const a of savedAttachments) {
    await prisma.attachments.create({
      data: {
        ticket_id: ticketId,
        filename: a.filename,
        size: a.size,
        mime_type: a.mimeType,
        stored_path: a.storedPath,
      },
    });
  }

  if (assignee) {
    await notifyTicketAssigned({
      ticketNumber,
      subject: values.subject,
      assigneeEmail: assignee.email,
      assigneeName: assignee.name,
    });
  }

  return NextResponse.json({ ticketNumber });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticketNumber = searchParams.get("ticketNumber")?.trim();
  const staffNo = searchParams.get("staffNo")?.trim();

  if (!ticketNumber && !staffNo) {
    return NextResponse.json({ error: "Provide ticketNumber or staffNo" }, { status: 400 });
  }

  const tickets = await prisma.tickets.findMany({
    where: {
      ...(ticketNumber ? { ticket_number: ticketNumber } : {}),
      ...(staffNo ? { staff_no: staffNo } : {}),
    },
    orderBy: { created_at: "desc" },
  });

  const results = [];
  for (const t of tickets) {
    const attachments = await prisma.attachments.findMany({
      where: { ticket_id: t.id },
      select: { filename: true, size: true },
    });
    const replies = await prisma.ticket_notes.findMany({
      where: { ticket_id: t.id, is_public: true },
      orderBy: { created_at: "asc" },
    });
    results.push({
      ticketNumber: t.ticket_number,
      category: t.category,
      team: t.team,
      priority: t.priority,
      status: t.status,
      name: t.name,
      subject: t.subject,
      message: t.message,
      createdAt: t.created_at,
      userRequestTypes: JSON.parse(t.user_request_types) as string[],
      attachments,
      replies: replies.map((r) => ({
        authorName: r.author_name,
        message: r.message,
        createdAt: r.created_at,
      })),
    });
  }

  return NextResponse.json(results);
}
