import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { TEAMS } from "@/app/lib/teams";

export async function POST(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageCategories) {
    return NextResponse.json({ error: "You don't have permission to manage categories" }, { status: 403 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const team = body.team;

  if (!name) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }
  if (!TEAMS.includes(team)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  try {
    const result = await prisma.categories.create({ data: { name, team } });
    return NextResponse.json({ id: result.id, name, team });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }
    throw err;
  }
}
