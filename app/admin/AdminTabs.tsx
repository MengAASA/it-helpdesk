import Link from "next/link";
import { LayoutGrid, Users, Tags, BarChart3, Settings, AppWindow, History } from "lucide-react";

type Requirement = "viewReports" | "manageUsers" | "manageCategories" | "settings" | "viewActivity" | null;

const TABS: { href: string; label: string; icon: typeof LayoutGrid; requires: Requirement }[] = [
  {
    href: "/admin",
    label: "Home",
    icon: LayoutGrid,
    requires: null,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    requires: "manageUsers",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tags,
    requires: "manageCategories",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    requires: "viewReports",
  },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: History,
    requires: "viewActivity",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    requires: "settings",
  },
  {
    href: "/admin/others",
    label: "Others",
    icon: AppWindow,
    requires: null,
  },
];

export default function AdminTabs({
  viewReports,
  manageUsers,
  manageCategories,
  hasSettingsAccess,
  viewActivity,
}: {
  viewReports: boolean;
  manageUsers: boolean;
  manageCategories: boolean;
  hasSettingsAccess: boolean;
  viewActivity: boolean;
}) {
  const visibleTabs = TABS.filter((tab) => {
    if (tab.requires === "viewReports") return viewReports;
    if (tab.requires === "manageUsers") return manageUsers;
    if (tab.requires === "manageCategories") return manageCategories;
    if (tab.requires === "settings") return hasSettingsAccess;
    if (tab.requires === "viewActivity") return viewActivity;
    return true;
  });

  return (
    <nav className="flex w-fit items-center gap-[3px] rounded-[11px] border border-card-border bg-white p-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="inline-flex items-center gap-[7px] rounded-[8px] px-[13.5px] py-[7.5px] text-[10.5px] font-semibold text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <Icon size={14} strokeWidth={2.25} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
