import { prisma } from "@/app/lib/db";

export type EmailTemplateKey =
  | "ticket_assigned"
  | "status_changed"
  | "ticket_reopened"
  | "requester_reply"
  | "new_reply"
  | "sla_breach";

export type EmailTemplateDefinition = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  tokens: string[];
  defaultSubject: string;
  defaultBody: string;
};

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    key: "ticket_assigned",
    label: "Ticket assigned",
    description: "Sent to a staff member when a ticket is assigned to them.",
    tokens: ["ticketNumber", "subject", "assigneeName", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] Assigned to you: {{subject}}",
    defaultBody: `<p>Hi {{assigneeName}},</p>
<p>Ticket <strong>{{ticketNumber}}</strong>: "{{subject}}" has been assigned to you.</p>
{{linkBlock}}`,
  },
  {
    key: "status_changed",
    label: "Status changed",
    description: "Sent to the requester when their ticket's status changes.",
    tokens: ["ticketNumber", "subject", "requesterName", "status", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] Status updated: {{status}}",
    defaultBody: `<p>Hi {{requesterName}},</p>
<p>Your ticket <strong>{{ticketNumber}}</strong>: "{{subject}}" is now <strong>{{status}}</strong>.</p>
{{linkBlock}}`,
  },
  {
    key: "ticket_reopened",
    label: "Ticket reopened",
    description: "Sent to the assignee when a requester reopens a closed ticket.",
    tokens: ["ticketNumber", "subject", "assigneeName", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] Reopened by requester: {{subject}}",
    defaultBody: `<p>Hi {{assigneeName}},</p>
<p>The requester reopened ticket <strong>{{ticketNumber}}</strong>: "{{subject}}". It looks like the issue isn't fully resolved yet.</p>
{{linkBlock}}`,
  },
  {
    key: "requester_reply",
    label: "Requester replied",
    description: "Sent to the assignee when the requester adds a reply to the ticket.",
    tokens: ["ticketNumber", "subject", "assigneeName", "requesterName", "message", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] New reply from {{requesterName}}",
    defaultBody: `<p>Hi {{assigneeName}},</p>
<p>{{requesterName}} replied on ticket <strong>{{ticketNumber}}</strong>: "{{subject}}":</p>
<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;color:#333;">{{message}}</blockquote>
{{linkBlock}}`,
  },
  {
    key: "new_reply",
    label: "Staff replied",
    description: "Sent to the requester when a staff member adds a public reply to their ticket.",
    tokens: ["ticketNumber", "subject", "requesterName", "message", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] New reply on your ticket",
    defaultBody: `<p>Hi {{requesterName}},</p>
<p>There's a new reply on your ticket <strong>{{ticketNumber}}</strong>: "{{subject}}":</p>
<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;color:#333;">{{message}}</blockquote>
{{linkBlock}}`,
  },
  {
    key: "sla_breach",
    label: "SLA breached",
    description: "Sent to the assignee when a ticket passes its SLA target for its priority.",
    tokens: ["ticketNumber", "subject", "recipientName", "ticketUrl", "linkBlock"],
    defaultSubject: "[{{ticketNumber}}] SLA breached: {{subject}}",
    defaultBody: `<p>Hi {{recipientName}},</p>
<p>Ticket <strong>{{ticketNumber}}</strong>: "{{subject}}" has passed its SLA target for its priority and is now overdue.</p>
{{linkBlock}}`,
  },
];

const DEFINITION_BY_KEY = new Map(EMAIL_TEMPLATE_DEFINITIONS.map((d) => [d.key, d]));

export function getTemplateDefinition(key: EmailTemplateKey): EmailTemplateDefinition {
  const def = DEFINITION_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown email template key: ${key}`);
  return def;
}

export type EmailTemplate = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  tokens: string[];
  subject: string;
  body: string;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function getEmailTemplate(key: EmailTemplateKey): Promise<{ subject: string; body: string }> {
  const def = getTemplateDefinition(key);
  const row = await prisma.email_templates.findUnique({ where: { template_key: key } });
  if (!row) return { subject: def.defaultSubject, body: def.defaultBody };
  return { subject: row.subject, body: row.body_html };
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const rows = await prisma.email_templates.findMany();
  const byKey = new Map(rows.map((r) => [r.template_key, r]));
  return EMAIL_TEMPLATE_DEFINITIONS.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      tokens: def.tokens,
      subject: row?.subject ?? def.defaultSubject,
      body: row?.body_html ?? def.defaultBody,
      isCustomized: !!row,
      updatedAt: row?.updated_at.toISOString() ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  });
}

export async function setEmailTemplate(
  key: EmailTemplateKey,
  subject: string,
  body: string,
  updatedBy: string
): Promise<void> {
  await prisma.email_templates.upsert({
    where: { template_key: key },
    create: { template_key: key, subject, body_html: body, updated_by: updatedBy },
    update: { subject, body_html: body, updated_by: updatedBy, updated_at: new Date() },
  });
}

export async function resetEmailTemplate(key: EmailTemplateKey): Promise<void> {
  await prisma.email_templates.deleteMany({ where: { template_key: key } });
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? vars[token] : match
  );
}
