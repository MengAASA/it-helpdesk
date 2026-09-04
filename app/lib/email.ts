import nodemailer from "nodemailer";
import { getEmailSettings } from "@/app/lib/emailSettings";

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    const settings = await getEmailSettings();
    if (!settings.enabled || !settings.host) {
      return { ok: false, error: "Email notifications are not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port ?? 587,
      secure: settings.secure,
      auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
    });

    await transporter.sendMail({
      from: settings.fromEmail
        ? `"${settings.fromName || "PHN Helpdesk"}" <${settings.fromEmail}>`
        : settings.username,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
