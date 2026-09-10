import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getEmailSettings, setEmailSettings } from "@/app/lib/emailSettings";
import { logEmailSettingsChange } from "@/app/lib/settingsAudit";

export async function PATCH(req: Request) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageEmailSettings) {
    return NextResponse.json({ error: "You don't have permission to manage settings" }, { status: 403 });
  }

  const body = await req.json();

  if (
    typeof body.enabled !== "boolean" ||
    typeof body.host !== "string" ||
    typeof body.secure !== "boolean" ||
    typeof body.username !== "string" ||
    typeof body.fromName !== "string" ||
    typeof body.fromEmail !== "string" ||
    typeof body.notifyAssigned !== "boolean" ||
    typeof body.notifyStatusChanged !== "boolean" ||
    typeof body.notifyNewReply !== "boolean" ||
    typeof body.notifySlaBreach !== "boolean" ||
    (body.port !== null && typeof body.port !== "number")
  ) {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
  }

  const current = await getEmailSettings();
  const password =
    typeof body.password === "string" && body.password.trim() ? body.password.trim() : current.password;

  const after = {
    enabled: body.enabled,
    host: body.host.trim(),
    port: body.port,
    secure: body.secure,
    username: body.username.trim(),
    password,
    fromName: body.fromName.trim(),
    fromEmail: body.fromEmail.trim(),
    notifyAssigned: body.notifyAssigned,
    notifyStatusChanged: body.notifyStatusChanged,
    notifyNewReply: body.notifyNewReply,
    notifySlaBreach: body.notifySlaBreach,
  };

  await setEmailSettings(after, session.email);

  await logEmailSettingsChange({
    before: current,
    after,
    actorName: session.name,
    actorEmail: session.email,
  });

  return NextResponse.json({ ok: true });
}
