import { prisma } from "@/app/lib/db";
import type { Permissions } from "@/app/lib/permissions";
import type { EmailSettings } from "@/app/lib/emailSettings";
import type { SlaHours } from "@/app/lib/sla";

export type SettingsAuditCategory = "permissions" | "email_settings" | "sla_settings";

export type SettingsAuditRow = {
  id: number;
  category: SettingsAuditCategory;
  target: string | null;
  summary: string;
  actorName: string;
  actorEmail: string;
  createdAt: string;
};

const NO_PRIOR_PERMISSIONS: Permissions = {
  manageTickets: false,
  viewReports: false,
  manageUsers: false,
  manageCategories: false,
  manageEmailSettings: false,
  manageSla: false,
  manageTemplates: false,
  viewActivity: false,
  team: null,
};

async function logSettingsChange(opts: {
  category: SettingsAuditCategory;
  target?: string | null;
  summary: string;
  actorName: string;
  actorEmail: string;
}): Promise<void> {
  await prisma.settings_audit_log.create({
    data: {
      category: opts.category,
      target: opts.target ?? null,
      summary: opts.summary,
      actor_name: opts.actorName,
      actor_email: opts.actorEmail,
    },
  });
}

const PERMISSION_LABELS: Record<keyof Omit<Permissions, "team">, string> = {
  manageTickets: "Manage tickets",
  viewReports: "View reports",
  manageUsers: "Manage users",
  manageCategories: "Manage categories",
  manageEmailSettings: "Manage email settings",
  manageSla: "Manage SLA",
  manageTemplates: "Manage templates",
  viewActivity: "View activity",
};

export async function logPermissionsChange(opts: {
  targetStaffId: string;
  targetLabel: string;
  before: Permissions | null;
  after: Permissions;
  actorName: string;
  actorEmail: string;
}): Promise<void> {
  const before = opts.before ?? NO_PRIOR_PERMISSIONS;
  const changes: string[] = [];
  for (const key of Object.keys(PERMISSION_LABELS) as (keyof typeof PERMISSION_LABELS)[]) {
    if (before[key] !== opts.after[key]) {
      changes.push(`${PERMISSION_LABELS[key]} ${opts.after[key] ? "granted" : "revoked"}`);
    }
  }
  if (before.team !== opts.after.team) {
    changes.push(`Team set to ${opts.after.team ?? "none"}`);
  }
  if (changes.length === 0) return;

  await logSettingsChange({
    category: "permissions",
    target: opts.targetStaffId,
    summary: `${opts.targetLabel}: ${changes.join(", ")}`,
    actorName: opts.actorName,
    actorEmail: opts.actorEmail,
  });
}

export async function logEmailSettingsChange(opts: {
  before: EmailSettings;
  after: EmailSettings;
  actorName: string;
  actorEmail: string;
}): Promise<void> {
  const changes: string[] = [];
  if (opts.before.enabled !== opts.after.enabled) changes.push(opts.after.enabled ? "Enabled" : "Disabled");
  if (opts.before.host !== opts.after.host) changes.push(`Host changed to "${opts.after.host || "(empty)"}"`);
  if (opts.before.port !== opts.after.port) changes.push(`Port changed to ${opts.after.port ?? "(empty)"}`);
  if (opts.before.secure !== opts.after.secure) changes.push(`Secure ${opts.after.secure ? "on" : "off"}`);
  if (opts.before.username !== opts.after.username) changes.push("Username changed");
  if (opts.before.password !== opts.after.password) changes.push("Password changed");
  if (opts.before.fromName !== opts.after.fromName)
    changes.push(`From name changed to "${opts.after.fromName || "(empty)"}"`);
  if (opts.before.fromEmail !== opts.after.fromEmail)
    changes.push(`From email changed to "${opts.after.fromEmail || "(empty)"}"`);
  if (opts.before.notifyAssigned !== opts.after.notifyAssigned)
    changes.push(`Notify assigned ${opts.after.notifyAssigned ? "on" : "off"}`);
  if (opts.before.notifyStatusChanged !== opts.after.notifyStatusChanged)
    changes.push(`Notify status changed ${opts.after.notifyStatusChanged ? "on" : "off"}`);
  if (opts.before.notifyNewReply !== opts.after.notifyNewReply)
    changes.push(`Notify new reply ${opts.after.notifyNewReply ? "on" : "off"}`);
  if (opts.before.notifySlaBreach !== opts.after.notifySlaBreach)
    changes.push(`Notify SLA breach ${opts.after.notifySlaBreach ? "on" : "off"}`);
  if (changes.length === 0) return;

  await logSettingsChange({
    category: "email_settings",
    summary: changes.join(", "),
    actorName: opts.actorName,
    actorEmail: opts.actorEmail,
  });
}

export async function logSlaSettingsChange(opts: {
  before: SlaHours;
  after: SlaHours;
  actorName: string;
  actorEmail: string;
}): Promise<void> {
  const changes: string[] = [];
  if (opts.before.enabled !== opts.after.enabled) changes.push(opts.after.enabled ? "Enabled" : "Disabled");
  if (opts.before.Low !== opts.after.Low) changes.push(`Low target changed to ${opts.after.Low}h`);
  if (opts.before.Normal !== opts.after.Normal) changes.push(`Normal target changed to ${opts.after.Normal}h`);
  if (opts.before.High !== opts.after.High) changes.push(`High target changed to ${opts.after.High}h`);
  if (changes.length === 0) return;

  await logSettingsChange({
    category: "sla_settings",
    summary: changes.join(", "),
    actorName: opts.actorName,
    actorEmail: opts.actorEmail,
  });
}

export async function getSettingsAuditLog(limit = 200): Promise<SettingsAuditRow[]> {
  const rows = await prisma.settings_audit_log.findMany({
    orderBy: { created_at: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    category: r.category as SettingsAuditCategory,
    target: r.target,
    summary: r.summary,
    actorName: r.actor_name,
    actorEmail: r.actor_email,
    createdAt: r.created_at.toISOString(),
  }));
}
