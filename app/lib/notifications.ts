import { sendEmail } from "@/app/lib/email";
import { getEmailSettings } from "@/app/lib/emailSettings";

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
    const link = adminTicketUrl(opts.ticketNumber);
    await sendEmail({
      to: opts.assigneeEmail,
      subject: `[${opts.ticketNumber}] Assigned to you: ${opts.subject}`,
      html: `
        <p>Hi ${escapeHtml(opts.assigneeName)},</p>
        <p>Ticket <strong>${opts.ticketNumber}</strong> — "${escapeHtml(opts.subject)}" has been assigned to you.</p>
        ${link ? `<p><a href="${link}">View ticket</a></p>` : ""}
      `,
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
    const link = publicTicketUrl(opts.ticketNumber);
    await sendEmail({
      to: opts.requesterEmail,
      subject: `[${opts.ticketNumber}] Status updated: ${opts.status}`,
      html: `
        <p>Hi ${escapeHtml(opts.requesterName)},</p>
        <p>Your ticket <strong>${opts.ticketNumber}</strong> — "${escapeHtml(opts.subject)}" is now
          <strong>${escapeHtml(opts.status)}</strong>.</p>
        ${link ? `<p><a href="${link}">View ticket</a></p>` : ""}
      `,
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
    const link = adminTicketUrl(opts.ticketNumber);
    await sendEmail({
      to: opts.assigneeEmail,
      subject: `[${opts.ticketNumber}] Reopened by requester: ${opts.subject}`,
      html: `
        <p>Hi ${escapeHtml(opts.assigneeName)},</p>
        <p>The requester reopened ticket <strong>${opts.ticketNumber}</strong> — "${escapeHtml(opts.subject)}".
          It looks like the issue isn't fully resolved yet.</p>
        ${link ? `<p><a href="${link}">View ticket</a></p>` : ""}
      `,
    });
  } catch (err) {
    console.error("[notifications] notifyTicketReopened failed:", err);
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
    const link = publicTicketUrl(opts.ticketNumber);
    await sendEmail({
      to: opts.requesterEmail,
      subject: `[${opts.ticketNumber}] New reply on your ticket`,
      html: `
        <p>Hi ${escapeHtml(opts.requesterName)},</p>
        <p>There's a new reply on your ticket <strong>${opts.ticketNumber}</strong> — "${escapeHtml(opts.subject)}":</p>
        <blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;color:#333;">
          ${escapeHtml(opts.message).replace(/\n/g, "<br/>")}
        </blockquote>
        ${link ? `<p><a href="${link}">View ticket</a></p>` : ""}
      `,
    });
  } catch (err) {
    console.error("[notifications] notifyNewReply failed:", err);
  }
}
