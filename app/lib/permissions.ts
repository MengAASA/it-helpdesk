import { prisma } from "@/app/lib/db";

export type Permissions = {
  manageTickets: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  team: string | null;
};

export const DEFAULT_PERMISSIONS: Permissions = {
  manageTickets: true,
  viewReports: true,
  manageUsers: true,
  team: null,
};

function normalizeStaffId(staffId: string): string {
  return staffId.trim().toLowerCase();
}

export async function getPermissionsFor(staffId: string): Promise<Permissions> {
  const row = await prisma.user_permissions.findUnique({
    where: { staff_no: normalizeStaffId(staffId) },
  });
  if (!row) return DEFAULT_PERMISSIONS;
  return {
    manageTickets: !!row.manage_tickets,
    viewReports: !!row.view_reports,
    manageUsers: !!row.manage_users,
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
      team: permissions.team,
      name: name ?? null,
      email: email ?? null,
      updated_by: updatedBy,
    },
    update: {
      manage_tickets: permissions.manageTickets,
      view_reports: permissions.viewReports,
      manage_users: permissions.manageUsers,
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
