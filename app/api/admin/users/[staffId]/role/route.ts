import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getIamsUsers, updateIamsUserRole } from "@/app/lib/iamsUsers";

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/users/[staffId]/role">
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
  if (staffId.toLowerCase() === session.staffId.toLowerCase()) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  const body = await req.json();
  if (body.role !== "admin" && body.role !== "user") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const result = await getIamsUsers();
  if (result.error) {
    return NextResponse.json({ error: "Could not reach IAMS to look up this user" }, { status: 502 });
  }
  const target = result.users.find((u) => u.staffId?.toLowerCase() === staffId.toLowerCase());
  if (!target) {
    return NextResponse.json({ error: "User not found in IAMS" }, { status: 404 });
  }

  const update = await updateIamsUserRole(target.id, body.role);
  if (!update.ok) {
    const message =
      update.error === "forbidden"
        ? "Your IAMS account isn't an administrator, so it can't change roles there."
        : update.error === "unauthenticated"
          ? "Your session could not be verified with IAMS."
          : "Could not reach IAMS to update the role.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
