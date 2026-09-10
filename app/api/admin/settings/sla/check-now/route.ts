import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { runSlaBreachCheck } from "@/app/lib/slaBreachCheck";

export async function POST() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageSla) {
    return NextResponse.json({ error: "You don't have permission to manage SLA settings" }, { status: 403 });
  }

  const result = await runSlaBreachCheck();
  return NextResponse.json({ ok: true, ...result });
}
