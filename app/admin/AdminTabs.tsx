import Link from "next/link";
import { LayoutGrid, Users, Tags, BarChart3, Settings, AppWindow } from "lucide-react";

const TABS = [
  {
    href: "/admin",
    label: "Home",
    icon: LayoutGrid,
    requires: null as "viewReports" | "manageUsers" | null,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    requires: "manageUsers" as const,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tags,
    requires: null,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    requires: "viewReports" as const,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    requires: "manageUsers" as const,
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
}: {
  viewReports: boolean;
  manageUsers: boolean;
}) {
  const visibleTabs = TABS.filter((tab) => {
    if (tab.requires === "viewReports") return viewReports;
    if (tab.requires === "manageUsers") return manageUsers;
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
