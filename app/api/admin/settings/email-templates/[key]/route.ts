import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import {
  EMAIL_TEMPLATE_DEFINITIONS,
  type EmailTemplateKey,
  getTemplateDefinition,
  setEmailTemplate,
  resetEmailTemplate,
} from "@/app/lib/emailTemplates";

const VALID_KEYS = new Set(EMAIL_TEMPLATE_DEFINITIONS.map((d) => d.key));

function isValidKey(key: string): key is EmailTemplateKey {
  return VALID_KEYS.has(key as EmailTemplateKey);
}

export async function PATCH(
  req: Request,
  { params }: RouteContext<"/api/admin/settings/email-templates/[key]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageTemplates) {
    return NextResponse.json({ error: "You don't have permission to manage templates" }, { status: 403 });
  }

  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const body = await req.json();
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const bodyHtml = typeof body.body === "string" ? body.body.trim() : "";
  if (!subject || !bodyHtml) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  await setEmailTemplate(key, subject, bodyHtml, session.email);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: RouteContext<"/api/admin/settings/email-templates/[key]">
) {
  const session = await getIamsSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);
  if (!permissions.manageTemplates) {
    return NextResponse.json({ error: "You don't have permission to manage templates" }, { status: 403 });
  }

  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  await resetEmailTemplate(key);
  const def = getTemplateDefinition(key);
  return NextResponse.json({ ok: true, subject: def.defaultSubject, body: def.defaultBody });
}
