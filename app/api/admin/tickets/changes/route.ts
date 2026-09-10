import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";

export async function GET(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const since = new Date(searchParams.get("since") ?? "");
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid since parameter" }, { status: 400 });
  }

  const [newTicket, newEvent] = await Promise.all([
    prisma.tickets.findFirst({ where: { created_at: { gt: since } }, select: { id: true } }),
    prisma.ticket_events.findFirst({ where: { created_at: { gt: since } }, select: { id: true } }),
  ]);

  return NextResponse.json({ hasChanges: !!newTicket || !!newEvent });
}
