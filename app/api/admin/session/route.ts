import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";

export async function GET() {
  const session = await getIamsSession();
  return NextResponse.json({ authenticated: !!session });
}
