import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { logSystemLinkChange } from "@/app/lib/settingsAudit";
import { canManageSystemLinks, parseSystemLinkInput } from "@/app/lib/systemLinks";

export async function POST(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSystemLinks(session.role)) {
    return NextResponse.json({ error: "Only admins can manage system links" }, { status: 403 });
  }

  const parsed = parseSystemLinkInput(await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, url, description } = parsed.value;
  const row = await prisma.system_links.create({ data: { name, url, description, created_by: session.email } });
  await logSystemLinkChange({ action: "added", name, url, actorName: session.name, actorEmail: session.email });

  return NextResponse.json({ id: row.id, name, url, description });
}
