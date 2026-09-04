import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { setSlaHours } from "@/app/lib/slaSettings";

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

export async function PATCH(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage settings" }, { status: 403 });
  }

  const body = await req.json();
  if (!isPositiveInt(body.Low) || !isPositiveInt(body.Normal) || !isPositiveInt(body.High)) {
    return NextResponse.json({ error: "SLA hours must be positive whole numbers" }, { status: 400 });
  }

  await setSlaHours({ Low: body.Low, Normal: body.Normal, High: body.High }, session.email);

  return NextResponse.json({ ok: true });
}
