import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor, setPermissionsFor } from "@/app/lib/permissions";
import { TEAMS } from "@/app/lib/teams";

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/permissions/[staffId]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorPermissions = await getPermissionsFor(session.staffId);
  if (!actorPermissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage users" }, { status: 403 });
  }

  const { staffId } = await params;
  const body = await req.json();

  if (
    typeof body.manageTickets !== "boolean" ||
    typeof body.viewReports !== "boolean" ||
    typeof body.manageUsers !== "boolean" ||
    (body.team !== null && !TEAMS.includes(body.team))
  ) {
    return NextResponse.json({ error: "Invalid permissions payload" }, { status: 400 });
  }

  await setPermissionsFor(
    staffId,
    {
      manageTickets: body.manageTickets,
      viewReports: body.viewReports,
      manageUsers: body.manageUsers,
      team: body.team,
    },
    session.email,
    typeof body.name === "string" ? body.name : undefined,
    typeof body.email === "string" ? body.email : undefined
  );

  return NextResponse.json({ ok: true });
}
