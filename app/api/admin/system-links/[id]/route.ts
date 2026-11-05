import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { logSystemLinkChange } from "@/app/lib/settingsAudit";
import { canManageSystemLinks, parseSystemLinkInput } from "@/app/lib/systemLinks";

async function authorize() {
  const session = await getIamsSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (!canManageSystemLinks(session.role)) {
    return { error: NextResponse.json({ error: "Only admins can manage system links" }, { status: 403 }) } as const;
  }
  return { session } as const;
}

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isNotFound(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/system-links/[id]">) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;

  const linkId = parseId((await params).id);
  if (linkId === null) return NextResponse.json({ error: "Invalid link id" }, { status: 400 });

  const parsed = parseSystemLinkInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { name, url, description } = parsed.value;
  try {
    await prisma.system_links.update({ where: { id: linkId }, data: { name, url, description } });
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    throw err;
  }
  await logSystemLinkChange({ action: "edited", name, url, actorName: auth.session.name, actorEmail: auth.session.email });

  return NextResponse.json({ id: linkId, name, url, description });
}

export async function DELETE(_req: Request, { params }: RouteContext<"/api/admin/system-links/[id]">) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;

  const linkId = parseId((await params).id);
  if (linkId === null) return NextResponse.json({ error: "Invalid link id" }, { status: 400 });

  let removed;
  try {
    removed = await prisma.system_links.delete({ where: { id: linkId } });
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    throw err;
  }
  await logSystemLinkChange({
    action: "removed",
    name: removed.name,
    url: removed.url,
    actorName: auth.session.name,
    actorEmail: auth.session.email,
  });

  return NextResponse.json({ ok: true });
}
