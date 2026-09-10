import { prisma } from "@/app/lib/db";
import { encryptSecret, decryptSecret } from "@/app/lib/secretCrypto";

export type EmailSettings = {
  enabled: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  notifyAssigned: boolean;
  notifyStatusChanged: boolean;
  notifyNewReply: boolean;
  notifySlaBreach: boolean;
};

export const EMPTY_EMAIL_SETTINGS: EmailSettings = {
  enabled: false,
  host: "",
  port: null,
  secure: false,
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  notifyAssigned: true,
  notifyStatusChanged: true,
  notifyNewReply: true,
  notifySlaBreach: true,
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const row = await prisma.email_settings.findUnique({ where: { id: 1 } });
  if (!row) return EMPTY_EMAIL_SETTINGS;
  return {
    enabled: !!row.enabled,
    host: row.smtp_host ?? "",
    port: row.smtp_port,
    secure: !!row.smtp_secure,
    username: row.smtp_username ?? "",
    password: row.smtp_password ? decryptSecret(row.smtp_password) : "",
    fromName: row.from_name ?? "",
    fromEmail: row.from_email ?? "",
    notifyAssigned: !!row.notify_assigned,
    notifyStatusChanged: !!row.notify_status_changed,
    notifyNewReply: !!row.notify_new_reply,
    notifySlaBreach: !!row.notify_sla_breach,
  };
}

export async function setEmailSettings(settings: EmailSettings, updatedBy: string): Promise<void> {
  const data = {
    enabled: settings.enabled,
    smtp_host: settings.host || null,
    smtp_port: settings.port,
    smtp_secure: settings.secure,
    smtp_username: settings.username || null,
    smtp_password: settings.password ? encryptSecret(settings.password) : null,
    from_name: settings.fromName || null,
    from_email: settings.fromEmail || null,
    notify_assigned: settings.notifyAssigned,
    notify_status_changed: settings.notifyStatusChanged,
    notify_new_reply: settings.notifyNewReply,
    notify_sla_breach: settings.notifySlaBreach,
    updated_by: updatedBy,
  };
  await prisma.email_settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}
