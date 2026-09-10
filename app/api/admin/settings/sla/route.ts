import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getSlaHours, setSlaHours } from "@/app/lib/slaSettings";
import { logSlaSettingsChange } from "@/app/lib/settingsAudit";

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

export async function PATCH(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageSla) {
    return NextResponse.json({ error: "You don't have permission to manage settings" }, { status: 403 });
  }

  const body = await req.json();
  if (
    typeof body.enabled !== "boolean" ||
    !isPositiveInt(body.Low) ||
    !isPositiveInt(body.Normal) ||
    !isPositiveInt(body.High)
  ) {
    return NextResponse.json({ error: "Invalid SLA settings payload" }, { status: 400 });
  }

  const current = await getSlaHours();
  const after = { enabled: body.enabled, Low: body.Low, Normal: body.Normal, High: body.High };

  await setSlaHours(after, session.email);

  await logSlaSettingsChange({
    before: current,
    after,
    actorName: session.name,
    actorEmail: session.email,
  });

  return NextResponse.json({ ok: true });
}
