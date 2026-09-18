import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { iamsLoginUrl } from "@/app/lib/iamsLoginUrl";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import SessionWatcher from "./SessionWatcher";
import AdminTabs from "./AdminTabs";
import PageTransition from "./PageTransition";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIamsSession();

  if (!session) {
    const pathname = (await headers()).get("x-pathname") ?? "/admin";
    redirect(iamsLoginUrl(pathname));
  }

  const permissions = await getPermissionsFor(session.staffId, session.role);

  return (
    <main className="flex w-full flex-1 flex-col gap-[24px] px-[42px] pb-[67.5px] pt-[42px]">
      <SessionWatcher loginUrl={iamsLoginUrl("/admin")} />

      <div className="flex flex-wrap items-center justify-between gap-[15px] rounded-[16px] bg-admin-gradient px-[24px] py-[19.5px] text-paper shadow-[0_10px_28px_rgba(46,16,101,0.25)]">
        <div className="flex items-center gap-[13.5px]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-paper/30 bg-paper/15 font-heading text-[15px] font-semibold">
            {initials(session.name)}
          </span>
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[13.5px] font-semibold">{session.name}</span>
            <span className="text-[10.5px] text-paper/75">{session.email}</span>
          </div>
        </div>
        <span className="rounded-full border border-paper/30 bg-paper/15 px-[12px] py-[5.25px] text-[9px] font-semibold uppercase tracking-[0.08em]">
          IT Admin
        </span>
      </div>

      <AdminTabs
        viewReports={permissions.viewReports}
        manageUsers={permissions.manageUsers}
        manageCategories={permissions.manageCategories}
        hasSettingsAccess={
          permissions.manageEmailSettings || permissions.manageSla || permissions.manageTemplates
        }
        viewActivity={permissions.viewActivity}
      />

      <PageTransition>{children}</PageTransition>
    </main>
  );
}
