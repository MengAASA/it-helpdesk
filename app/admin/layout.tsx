import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getOnlineUsers } from "@/app/lib/presence";
import { SIDEBAR_COOKIE } from "@/app/lib/theme";
import SessionWatcher from "./SessionWatcher";
import AdminShell from "./AdminShell";
import PageTransition from "./PageTransition";

function roleLabel(role: string): string {
  if (role === "admin") return "Administrator";
  if (role === "user") return "IT staff";
  return role;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIamsSession();

  if (!session) {
    const pathname = (await headers()).get("x-pathname") ?? "/admin";
    redirect(iamsLoginUrl(pathname));
  }

  const [permissions, onlineUsers, cookieStore] = await Promise.all([
    getPermissionsFor(session.staffId, session.role),
    getOnlineUsers(),
    cookies(),
  ]);

  return (
    <AdminShell
      user={{ name: session.name, email: session.email, role: roleLabel(session.role) }}
      access={{
        viewReports: permissions.viewReports,
        manageUsers: permissions.manageUsers,
        manageCategories: permissions.manageCategories,
        hasSettingsAccess: permissions.manageEmailSettings || permissions.manageSla || permissions.manageTemplates,
        viewActivity: permissions.viewActivity,
      }}
      onlineUsers={onlineUsers}
      // Collapsed unless this browser has chosen to keep it expanded.
      initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value !== "expanded"}
    >
      <SessionWatcher loginUrl={iamsLoginUrl("/admin")} />
      <PageTransition>{children}</PageTransition>
    </AdminShell>
  );
}
