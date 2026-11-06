"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon, Monitor, ChevronRight, LogOut, ExternalLink, Check } from "lucide-react";
import Avatar from "@/app/components/Avatar";
import { useDismiss } from "@/app/components/useDismiss";
import { applyTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/app/lib/theme";
import type { SidebarAccess } from "./AdminSidebar";
import TopBarSearch from "./TopBarSearch";

const SECTION_LABELS: Record<string, string> = {
  tickets: "Tickets",
  reports: "Reports & analytics",
  activity: "Activity log",
  users: "User management",
  categories: "Categories",
  settings: "System settings",
  others: "Other systems",
};

function breadcrumbsFor(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  const crumbs = [{ label: "Dashboard", href: "/admin" }];
  let href = "/admin";
  for (const segment of segments) {
    href += `/${segment}`;
    crumbs.push({ label: SECTION_LABELS[segment] ?? decodeURIComponent(segment), href });
  }
  return crumbs;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const THEME_EVENT = "phn-theme-change";

function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Storage blocked: fall back to the light default.
  }
  return "light";
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const pref = useSyncExternalStore(subscribeTheme, readThemePreference, () => "light" as const);
  const ref = useDismiss(open, () => setOpen(false));

  const choose = (value: ThemePreference) => {
    setOpen(false);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Storage blocked: the choice still applies for this page view.
    }
    applyTheme(value);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const Current = THEME_OPTIONS.find((o) => o.value === pref)?.icon ?? Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
        className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Current size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[38px] z-50 w-[140px] rounded-[8px] border border-card-border bg-surface p-[4px] shadow-pop">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.value}
              onClick={() => choose(o.value)}
              className="flex h-[30px] w-full items-center gap-[8px] rounded-[5px] px-[8px] text-[13px] text-ink hover:bg-surface-2"
            >
              <o.icon size={14} strokeWidth={1.75} className="text-muted-2" />
              {o.label}
              {pref === o.value && <Check size={14} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ user }: { user: { name: string; email: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch(`${basePath}/api/admin/signout`, { method: "POST" });
    } finally {
      window.location.href = basePath || "/";
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-[32px] items-center rounded-full transition-opacity hover:opacity-85"
      >
        <Avatar name={user.name} size={28} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[38px] z-50 w-[240px] rounded-[8px] border border-card-border bg-surface p-[4px] shadow-pop">
          <div className="flex flex-col px-[8px] py-[8px]">
            <span className="truncate text-[13px] font-medium text-ink">{user.name}</span>
            <span className="truncate text-[12px] text-muted-2">{user.email}</span>
            <span className="mt-[6px] w-fit rounded-[4px] bg-surface-2 px-[6px] py-[1px] text-[11px] font-medium capitalize text-muted">
              {user.role}
            </span>
          </div>
          <div className="my-[4px] h-px bg-card-border" />
          <Link
            href="/"
            role="menuitem"
            className="flex h-[30px] items-center gap-[8px] rounded-[5px] px-[8px] text-[13px] text-ink hover:bg-surface-2"
          >
            <ExternalLink size={14} strokeWidth={1.75} className="text-muted-2" />
            Staff portal
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="flex h-[30px] w-full items-center gap-[8px] rounded-[5px] px-[8px] text-[13px] text-ink hover:bg-surface-2 disabled:opacity-60"
          >
            <LogOut size={14} strokeWidth={1.75} className="text-muted-2" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminTopBar({
  user,
  access,
  onOpenMobile,
  insetClassName,
}: {
  user: { name: string; email: string; role: string };
  /** Which admin pages this person can open, so search only suggests those. */
  access: SidebarAccess;
  onOpenMobile: () => void;
  /** Left padding that keeps the bar's content clear of the floating sidebar it sits under. */
  insetClassName: string;
}) {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);

  return (
    <header
      className={`sticky top-0 z-30 flex h-[52px] w-full shrink-0 items-center gap-[12px] border-b border-card-border/60 bg-paper/55 px-[16px] backdrop-blur-xl md:pr-[24px] ${insetClassName}`}
    >
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-muted-2 hover:bg-surface-2 hover:text-ink md:hidden"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-[4px] text-[13px]">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.href} className={`flex min-w-0 items-center gap-[4px] ${last ? "" : "hidden sm:flex"}`}>
                {i > 0 && <ChevronRight size={14} className="shrink-0 text-faint" aria-hidden="true" />}
                {last ? (
                  <span aria-current="page" className="truncate font-medium text-ink">
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="truncate text-muted-2 hover:text-ink">
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <TopBarSearch access={access} userName={user.name} />

      <ThemeMenu />
      <ProfileMenu user={user} />
    </header>
  );
}
