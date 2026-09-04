import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getOnlineUsers } from "@/app/lib/presence";

export async function GET() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getOnlineUsers();
  return NextResponse.json({ users });
}
