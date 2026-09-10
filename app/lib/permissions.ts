import { prisma } from "@/app/lib/db";

export type Permissions = {
  manageTickets: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  manageCategories: boolean;
  manageEmailSettings: boolean;
  manageSla: boolean;
  manageTemplates: boolean;
  viewActivity: boolean;
  team: string | null;
};

/** Default for IAMS "admin"-role staff (or any role besides "user") when no explicit row exists yet. */
export const DEFAULT_PERMISSIONS: Permissions = {
  manageTickets: true,
  viewReports: true,
  manageUsers: true,
  manageCategories: true,
  manageEmailSettings: true,
  manageSla: true,
  manageTemplates: true,
  viewActivity: true,
  team: null,
};

/** Default for IAMS "user"-role staff when no explicit row exists yet — least privilege. */
export const USER_ROLE_DEFAULT_PERMISSIONS: Permissions = {
  manageTickets: true,
  viewReports: true,
  manageUsers: false,
  manageCategories: false,
  manageEmailSettings: false,
  manageSla: false,
  manageTemplates: false,
  viewActivity: false,
  team: null,
};

function normalizeStaffId(staffId: string): string {
  return staffId.trim().toLowerCase();
}

/**
 * `role` is the person's IAMS role (e.g. "admin" or "user") and only matters when they have
 * no explicit `user_permissions` row yet — it picks which default set they start from. Once an
 * admin saves explicit permissions for someone (via the Users tab), that row always wins.
 */
export async function getPermissionsFor(staffId: string, role: string): Promise<Permissions> {
  const row = await prisma.user_permissions.findUnique({
    where: { staff_no: normalizeStaffId(staffId) },
  });
  if (!row) return role === "user" ? USER_ROLE_DEFAULT_PERMISSIONS : DEFAULT_PERMISSIONS;
  return {
    manageTickets: !!row.manage_tickets,
    viewReports: !!row.view_reports,
    manageUsers: !!row.manage_users,
    manageCategories: !!row.manage_categories,
    manageEmailSettings: !!row.manage_email_settings,
    manageSla: !!row.manage_sla,
    manageTemplates: !!row.manage_templates,
    viewActivity: !!row.view_activity,
    team: row.team,
  };
}

/**
 * Unlike getPermissionsFor, this never falls back to a role-based default — it returns the
 * explicit row only, or null if the staff member has never had permissions set. Used for audit
 * diffing, where a role-based fallback would misrepresent what was actually stored before.
 */
export async function getStoredPermissionsFor(staffId: string): Promise<Permissions | null> {
  const row = await prisma.user_permissions.findUnique({
    where: { staff_no: normalizeStaffId(staffId) },
  });
  if (!row) return null;
  return {
    manageTickets: !!row.manage_tickets,
    viewReports: !!row.view_reports,
    manageUsers: !!row.manage_users,
    manageCategories: !!row.manage_categories,
    manageEmailSettings: !!row.manage_email_settings,
    manageSla: !!row.manage_sla,
    manageTemplates: !!row.manage_templates,
    viewActivity: !!row.view_activity,
    team: row.team,
  };
}

export async function setPermissionsFor(
  staffId: string,
  permissions: Permissions,
  updatedBy: string,
  name?: string,
  email?: string
): Promise<void> {
  const normalized = normalizeStaffId(staffId);
  await prisma.user_permissions.upsert({
    where: { staff_no: normalized },
    create: {
      staff_no: normalized,
      manage_tickets: permissions.manageTickets,
      view_reports: permissions.viewReports,
      manage_users: permissions.manageUsers,
      manage_categories: permissions.manageCategories,
      manage_email_settings: permissions.manageEmailSettings,
      manage_sla: permissions.manageSla,
      manage_templates: permissions.manageTemplates,
      view_activity: permissions.viewActivity,
      team: permissions.team,
      name: name ?? null,
      email: email ?? null,
      updated_by: updatedBy,
    },
    update: {
      manage_tickets: permissions.manageTickets,
      view_reports: permissions.viewReports,
      manage_users: permissions.manageUsers,
      manage_categories: permissions.manageCategories,
      manage_email_settings: permissions.manageEmailSettings,
      manage_sla: permissions.manageSla,
      manage_templates: permissions.manageTemplates,
      view_activity: permissions.viewActivity,
      team: permissions.team,
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      updated_by: updatedBy,
    },
  });
}

export async function getCachedEmailByName(name: string): Promise<string | null> {
  const row = await prisma.user_permissions.findFirst({
    where: { name },
    select: { email: true },
  });
  return row?.email ?? null;
}
