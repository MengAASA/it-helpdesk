import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor, getStoredPermissionsFor, setPermissionsFor } from "@/app/lib/permissions";
import { logPermissionsChange } from "@/app/lib/settingsAudit";
import { TEAMS } from "@/app/lib/teams";

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/permissions/[staffId]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorPermissions = await getPermissionsFor(session.staffId, session.role);
  if (!actorPermissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage users" }, { status: 403 });
  }

  const { staffId } = await params;
  const body = await req.json();

  if (
    typeof body.manageTickets !== "boolean" ||
    typeof body.viewReports !== "boolean" ||
    typeof body.manageUsers !== "boolean" ||
    typeof body.manageCategories !== "boolean" ||
    typeof body.manageEmailSettings !== "boolean" ||
    typeof body.manageSla !== "boolean" ||
    typeof body.manageTemplates !== "boolean" ||
    typeof body.viewActivity !== "boolean" ||
    (body.team !== null && !TEAMS.includes(body.team))
  ) {
    return NextResponse.json({ error: "Invalid permissions payload" }, { status: 400 });
  }

  const before = await getStoredPermissionsFor(staffId);
  const after = {
    manageTickets: body.manageTickets,
    viewReports: body.viewReports,
    manageUsers: body.manageUsers,
    manageCategories: body.manageCategories,
    manageEmailSettings: body.manageEmailSettings,
    manageSla: body.manageSla,
    manageTemplates: body.manageTemplates,
    viewActivity: body.viewActivity,
    team: body.team,
  };

  await setPermissionsFor(
    staffId,
    after,
    session.email,
    typeof body.name === "string" ? body.name : undefined,
    typeof body.email === "string" ? body.email : undefined
  );

  await logPermissionsChange({
    targetStaffId: staffId,
    targetLabel: typeof body.name === "string" && body.name ? body.name : staffId,
    before,
    after,
    actorName: session.name,
    actorEmail: session.email,
  });

  return NextResponse.json({ ok: true });
}
