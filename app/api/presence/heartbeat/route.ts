import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { recordHeartbeat } from "@/app/lib/presence";

export async function POST() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await recordHeartbeat(session.staffId, session.name);
  return NextResponse.json({ ok: true });
}
