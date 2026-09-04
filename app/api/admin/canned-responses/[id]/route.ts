import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/canned-responses/[id]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage templates" }, { status: 403 });
  }

  const { id } = await params;
  const responseId = Number(id);
  if (!Number.isInteger(responseId)) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  const body = await req.json();
  const data: { title?: string; body?: string; is_public?: boolean } = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Template title is required" }, { status: 400 });
    }
    data.title = title;
  }
  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text) {
      return NextResponse.json({ error: "Template body is required" }, { status: 400 });
    }
    data.body = text;
  }
  if (typeof body.isPublic === "boolean") {
    data.is_public = body.isPublic;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await prisma.canned_responses.update({ where: { id: responseId }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: RouteContext<"/api/admin/canned-responses/[id]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage templates" }, { status: 403 });
  }

  const { id } = await params;
  const responseId = Number(id);
  if (!Number.isInteger(responseId)) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  try {
    await prisma.canned_responses.delete({ where: { id: responseId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
