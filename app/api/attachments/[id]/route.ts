import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";

export async function GET(
  req: Request,
  { params }: RouteContext<"/api/attachments/[id]">
) {
  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isInteger(attachmentId)) {
    return NextResponse.json({ error: "Invalid attachment id" }, { status: 400 });
  }

  const attachment = await prisma.attachments.findUnique({
    where: { id: attachmentId },
    select: {
      filename: true,
      mime_type: true,
      stored_path: true,
      tickets: { select: { ticket_number: true } },
    },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const session = await getIamsSession();
  if (!session) {
    const { searchParams } = new URL(req.url);
    const ticketNumber = searchParams.get("ticketNumber");
    if (ticketNumber !== attachment.tickets.ticket_number) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  try {
    const bytes = await readFile(attachment.stored_path);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File no longer available" }, { status: 404 });
  }
}
