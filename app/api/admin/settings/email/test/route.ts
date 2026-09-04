import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { sendEmail } from "@/app/lib/email";

export async function POST() {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId);
  if (!permissions.manageUsers) {
    return NextResponse.json({ error: "You don't have permission to manage settings" }, { status: 403 });
  }

  const result = await sendEmail({
    to: session.email,
    subject: "PHN Helpdesk — test email",
    html: `<p>This is a test email from PHN Helpdesk. If you received this, your email settings are working.</p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
