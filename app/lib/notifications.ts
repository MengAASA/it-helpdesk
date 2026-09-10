import { sendEmail } from "@/app/lib/email";
import { getEmailSettings } from "@/app/lib/emailSettings";
import { getEmailTemplate, renderTemplate } from "@/app/lib/emailTemplates";

const APP_URL = process.env.APP_URL ?? "";

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function adminTicketUrl(ticketNumber: string): string | null {
  return APP_URL ? `${APP_URL}/admin/tickets/${ticketNumber}` : null;
}

function publicTicketUrl(ticketNumber: string): string | null {
  return APP_URL ? `${APP_URL}/tickets/${ticketNumber}` : null;
}

function linkBlock(url: string | null): string {
  return url ? `<p><a href="${url}">View ticket</a></p>` : "";
}

export async function notifyTicketAssigned(opts: {
  ticketNumber: string;
  subject: string;
  assigneeEmail: string | null;
  assigneeName: string;
}): Promise<void> {
  if (!opts.assigneeEmail) return;
  try {
    const settings = await getEmailSettings();
    if (!settings.notifyAssigned) return;
    const template = await getEmailTemplate("ticket_assigned");
    const url = adminTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      assigneeName: escapeHtml(opts.assigneeName),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    await sendEmail({
      to: opts.assigneeEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
  } catch (err) {
    console.error("[notifications] notifyTicketAssigned failed:", err);
  }
}

export async function notifyStatusChanged(opts: {
  ticketNumber: string;
  subject: string;
  requesterEmail: string;
  requesterName: string;
  status: string;
}): Promise<void> {
  try {
    const settings = await getEmailSettings();
    if (!settings.notifyStatusChanged) return;
    const template = await getEmailTemplate("status_changed");
    const url = publicTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject, status: opts.status };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      requesterName: escapeHtml(opts.requesterName),
      status: escapeHtml(opts.status),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    await sendEmail({
      to: opts.requesterEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
  } catch (err) {
    console.error("[notifications] notifyStatusChanged failed:", err);
  }
}

export async function notifyTicketReopened(opts: {
  ticketNumber: string;
  subject: string;
  assigneeEmail: string | null;
  assigneeName: string;
}): Promise<void> {
  if (!opts.assigneeEmail) return;
  try {
    const settings = await getEmailSettings();
    if (!settings.notifyStatusChanged) return;
    const template = await getEmailTemplate("ticket_reopened");
    const url = adminTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      assigneeName: escapeHtml(opts.assigneeName),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    await sendEmail({
      to: opts.assigneeEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
  } catch (err) {
    console.error("[notifications] notifyTicketReopened failed:", err);
  }
}

export async function notifyRequesterReply(opts: {
  ticketNumber: string;
  subject: string;
  assigneeEmail: string | null;
  assigneeName: string;
  requesterName: string;
  message: string;
}): Promise<void> {
  if (!opts.assigneeEmail) return;
  try {
    const settings = await getEmailSettings();
    if (!settings.notifyNewReply) return;
    const template = await getEmailTemplate("requester_reply");
    const url = adminTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject, requesterName: opts.requesterName };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      assigneeName: escapeHtml(opts.assigneeName),
      requesterName: escapeHtml(opts.requesterName),
      message: escapeHtml(opts.message).replace(/\n/g, "<br/>"),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    await sendEmail({
      to: opts.assigneeEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
  } catch (err) {
    console.error("[notifications] notifyRequesterReply failed:", err);
  }
}

/**
 * Unlike the other notify* functions, this reports whether the email actually went out
 * (rather than firing-and-forgetting) — the SLA breach scanner uses that to decide
 * whether it's safe to stop retrying this ticket or whether it should try again next run.
 */
export async function notifySlaBreach(opts: {
  ticketNumber: string;
  subject: string;
  recipientEmail: string;
  recipientName: string;
}): Promise<boolean> {
  try {
    const settings = await getEmailSettings();
    if (!settings.notifySlaBreach) return false;
    const template = await getEmailTemplate("sla_breach");
    const url = adminTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      recipientName: escapeHtml(opts.recipientName),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    const result = await sendEmail({
      to: opts.recipientEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
    return result.ok;
  } catch (err) {
    console.error("[notifications] notifySlaBreach failed:", err);
    return false;
  }
}

export async function notifyNewReply(opts: {
  ticketNumber: string;
  subject: string;
  requesterEmail: string;
  requesterName: string;
  message: string;
}): Promise<void> {
  try {
    const settings = await getEmailSettings();
    if (!settings.notifyNewReply) return;
    const template = await getEmailTemplate("new_reply");
    const url = publicTicketUrl(opts.ticketNumber);
    const subjectVars = { ticketNumber: opts.ticketNumber, subject: opts.subject };
    const bodyVars = {
      ticketNumber: opts.ticketNumber,
      subject: escapeHtml(opts.subject),
      requesterName: escapeHtml(opts.requesterName),
      message: escapeHtml(opts.message).replace(/\n/g, "<br/>"),
      ticketUrl: url ?? "",
      linkBlock: linkBlock(url),
    };
    await sendEmail({
      to: opts.requesterEmail,
      subject: renderTemplate(template.subject, subjectVars),
      html: renderTemplate(template.body, bodyVars),
    });
  } catch (err) {
    console.error("[notifications] notifyNewReply failed:", err);
  }
}
