import { NextResponse } from "next/server";
import { runSlaBreachCheck } from "@/app/lib/slaBreachCheck";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSlaBreachCheck();
  return NextResponse.json({ ok: true, ...result });
}
