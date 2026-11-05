import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getSystemLinks } from "@/app/lib/systemLinks";

/**
 * The admin-managed links to other IT systems, for anyone signed in to IAMS. IAMS calls this from
 * its own server (forwarding the visitor's `token` cookie) to list the links in its sidebar.
 */
export async function GET() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const links = await getSystemLinks();
  return NextResponse.json(links, { headers: { "Cache-Control": "no-store" } });
}
