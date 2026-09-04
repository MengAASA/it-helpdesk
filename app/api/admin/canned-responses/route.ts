import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";

export async function POST(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage templates" }, { status: 403 });
  }

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const isPublic = !!body.isPublic;

  if (!title) {
    return NextResponse.json({ error: "Template title is required" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Template body is required" }, { status: 400 });
  }

  const result = await prisma.canned_responses.create({
    data: { title, body: text, is_public: isPublic },
  });

  return NextResponse.json({ id: result.id, title, body: text, isPublic });
}
