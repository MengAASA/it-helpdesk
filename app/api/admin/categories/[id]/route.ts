import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";

export async function DELETE(
  req: Request,
  { params }: RouteContext<"/api/admin/categories/[id]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage categories" }, { status: 403 });
  }

  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    await prisma.categories.delete({ where: { id: categoryId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
