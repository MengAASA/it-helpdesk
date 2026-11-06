"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  UserCheck,
  BarChart3,
  History,
  Users,
  Tags,
  Settings,
  AppWindow,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";
import { useOnlineUsers, type OnlineUser } from "@/app/components/useOnlineUsers";

export type SidebarAccess = {
  viewReports: boolean;
  manageUsers: boolean;
  manageCategories: boolean;
  hasSettingsAccess: boolean;
  viewActivity: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Decides the active state; defaults to "this path or anything under it". */
  isActive?: (pathname: string, search: URLSearchParams) => boolean;
};

/*
 * Collapse geometry: every row keeps the same left inset in both widths, so icons stay put and only
 * the width and the label opacity animate. At 60px wide the 16px icons, 26px avatar and logo all
 * centre on x = 30.
 */
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function fade(narrow: boolean) {
  // Labels leave fast and arrive after the width has mostly opened.
  return `whitespace-nowrap transition-opacity motion-reduce:transition-none ${
    narrow ? "opacity-0 duration-100" : "opacity-100 duration-200 delay-100"
  }`;
}

export function buildSections(access: SidebarAccess, userName: string): { label: string; items: NavItem[] }[] {
  const mine = `/admin/tickets?assignee=${encodeURIComponent(userName)}`;
  const sections = [
    {
      label: "Workspace",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, isActive: (p: string) => p === "/admin" },
        {
          href: "/admin/tickets",
          label: "All tickets",
          icon: Inbox,
          isActive: (p: string, s: URLSearchParams) => p.startsWith("/admin/tickets") && s.get("assignee") !== userName,
        },
        {
          href: mine,
          label: "Assigned to me",
          icon: UserCheck,
          isActive: (p: string, s: URLSearchParams) => p === "/admin/tickets" && s.get("assignee") === userName,
        },
      ],
    },
    {
      label: "Insights",
      items: [
        ...(access.viewReports ? [{ href: "/admin/reports", label: "Reports & analytics", icon: BarChart3 }] : []),
        ...(access.viewActivity ? [{ href: "/admin/activity", label: "Activity log", icon: History }] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(access.manageUsers ? [{ href: "/admin/users", label: "User management", icon: Users }] : []),
        ...(access.manageCategories ? [{ href: "/admin/categories", label: "Categories", icon: Tags }] : []),
        ...(access.hasSettingsAccess ? [{ href: "/admin/settings", label: "System settings", icon: Settings }] : []),
      ],
    },
    { label: "More", items: [{ href: "/admin/others", label: "Other systems", icon: AppWindow }] },
  ];
  return sections.filter((s) => s.items.length > 0);
}

function NavLinks({
  sections,
  narrow,
  onNavigate,
  search,
}: {
  sections: { label: string; items: NavItem[] }[];
  narrow: boolean;
  onNavigate: () => void;
  search: URLSearchParams;
}) {
  const pathname = usePathname();
  return (
    <>
      <LiquidIndicator activeKey={`${pathname}?${search.toString()}`} />
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-[2px]">
          <div className="relative h-[28px] shrink-0" aria-hidden={narrow}>
            <span className={`absolute bottom-[6px] left-[14px] text-[11px] font-medium text-nav-text/60 ${fade(narrow)}`}>
              {section.label}
            </span>
            <span
              className={`absolute left-[14px] top-1/2 h-px w-[16px] bg-sidebar-border transition-opacity duration-200 ${
                narrow ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
          {section.items.map((item) => {
            const active = item.isActive
              ? item.isActive(pathname, search)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                title={narrow ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-[32px] items-center gap-[12px] rounded-[6px] px-[14px] text-[13px] font-medium transition-colors duration-150 ${
                  active ? "text-white" : "text-nav-text/75 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} className="relative shrink-0" />
                <span className={`relative truncate ${fade(narrow)}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

const GOO_FILTER_ID = "admin-nav-goo";
const ITEM_HEIGHT = 32;
const HIGHLIGHT_OPACITY = 0.1;

/** The head lands slightly past its target and settles back, like a drop that has just fallen. */
const HEAD_SPRING = { stiffness: 300, damping: 21, mass: 0.8 };
/** The tail is two soft links behind the head, so it clings to the old item before letting go. */
const TAIL_SPRING = { stiffness: 170, damping: 22, mass: 0.9 };
/** Neck width at rest; it thins as the stream lengthens (same volume, longer column). */
const NECK_WIDTH = 20;
/** Reach at which the neck has thinned to nothing and the stream has pinched apart. */
const NECK_BREAK = 250;

/**
 * The active-item highlight, moving as liquid.
 *
 * White shapes sit in a layer run through an SVG "goo" filter: the blur softens them and the alpha
 * threshold snaps the result back to crisp edges, so anything that touches fuses like fluid and
 * separates through a thinning neck. At rest every shape overlaps and the layer reads as a single
 * pill. On a move:
 *   - the head springs to the new item, stretching along its path while fast and squashing back
 *     as it lands and overshoots;
 *   - the tail clings to the old item on two soft spring links, shrinking as it drains;
 *   - a ligament joins tail to head and narrows as it lengthens, until it pinches off;
 *   - two droplets bead up along the ligament, the way a stretched stream of water does.
 * Everything is recomputed each frame from the head and tail positions, then the whole layer is
 * faded to the highlight's tint.
 */
function LiquidIndicator({ activeKey }: { activeKey: string }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const reduceMotion = useReducedMotion();
  const visible = useMotionValue(0);
  const layerOpacity = useMotionValue(0);

  const target = useMotionValue(0);
  const head = useSpring(target, HEAD_SPRING);
  const tailLink = useSpring(head, TAIL_SPRING);
  const tail = useSpring(tailLink, TAIL_SPRING);

  const headScaleX = useMotionValue(1);
  const headScaleY = useMotionValue(1);
  const tailScaleX = useMotionValue(1);
  const tailScaleY = useMotionValue(1);
  const neckTop = useMotionValue(0);
  const neckHeight = useMotionValue(0);
  const neckWidth = useMotionValue(0);
  const dropNearY = useMotionValue(0);
  const dropFarY = useMotionValue(0);
  const dropScale = useMotionValue(0);

  useEffect(() => {
    const reshape = () => {
      const headCentre = head.get() + ITEM_HEIGHT / 2;
      const tailCentre = tail.get() + ITEM_HEIGHT / 2;
      const reach = Math.abs(headCentre - tailCentre);
      const speed = Math.abs(head.getVelocity());

      // Fast-moving liquid elongates along its path and narrows, relaxing as it slows.
      headScaleY.set(1 + Math.min(0.3, speed / 3000));
      headScaleX.set(1 - Math.min(0.12, speed / 6500));
      // The further the stream reaches, the more the tail has drained away from the old item.
      // Draining from the sides first, so it rounds into a droplet rather than shrinking as a bar.
      tailScaleX.set(Math.max(0.22, 1 - reach / 150));
      tailScaleY.set(Math.max(0.5, 1 - reach / 320));

      neckTop.set(Math.min(headCentre, tailCentre));
      neckHeight.set(reach);
      neckWidth.set(Math.max(0, NECK_WIDTH * (1 - reach / NECK_BREAK)));

      // Droplets sit nearer the tail, where a draining stream beads first.
      dropNearY.set(tailCentre + (headCentre - tailCentre) * 0.3);
      dropFarY.set(tailCentre + (headCentre - tailCentre) * 0.62);
      dropScale.set(Math.min(1, reach / 70));
    };
    reshape();
    const stops = [head.on("change", reshape), tail.on("change", reshape)];
    return () => stops.forEach((stop) => stop());
  }, [head, tail, headScaleX, headScaleY, tailScaleX, tailScaleY, neckTop, neckHeight, neckWidth, dropNearY, dropFarY, dropScale]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const nav = layer?.parentElement;
    if (!layer || !nav) return;
    // The filter only paints inside the layer, so it has to cover the full scrollable list.
    layer.style.height = `${nav.scrollHeight}px`;

    const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!active) {
      visible.set(0);
      layerOpacity.set(0);
      placed.current = false;
      return;
    }
    const y = active.offsetTop;
    visible.set(1);
    layerOpacity.set(HIGHLIGHT_OPACITY);
    target.set(y);
    if (!placed.current || reduceMotion) {
      // First paint, or reduced motion: put every piece straight on the item without animating.
      for (const piece of [head, tailLink, tail]) piece.jump(y);
      placed.current = true;
    }
  }, [activeKey, reduceMotion, target, head, tailLink, tail, visible, layerOpacity]);

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <filter id={GOO_FILTER_ID} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
        </defs>
      </svg>

      <motion.div
        ref={layerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ filter: `url(#${GOO_FILTER_ID})`, opacity: layerOpacity }}
      >
        <motion.div
          className="absolute left-[8px] right-[8px] top-0 rounded-[8px] bg-white"
          style={{ height: ITEM_HEIGHT, y: tail, scaleX: tailScaleX, scaleY: tailScaleY }}
        />
        <motion.div
          className="absolute left-1/2 top-0 rounded-full bg-white"
          style={{ y: neckTop, height: neckHeight, width: neckWidth, x: "-50%" }}
        />
        <motion.div
          className="absolute left-1/2 top-[-7px] h-[14px] w-[22px] rounded-full bg-white"
          style={{ y: dropNearY, x: "-50%", scale: dropScale }}
        />
        <motion.div
          className="absolute left-1/2 top-[-6px] h-[12px] w-[16px] rounded-full bg-white"
          style={{ y: dropFarY, x: "-50%", scale: dropScale }}
        />
        <motion.div
          className="absolute left-[8px] right-[8px] top-0 rounded-[8px] bg-white"
          style={{ height: ITEM_HEIGHT, y: head, scaleX: headScaleX, scaleY: headScaleY }}
        />
      </motion.div>

      {/* The accent marker stays crisp outside the filter and rides with the head. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute left-[11px] top-[9px] h-[14px] w-[2px] rounded-full bg-primary-light"
        style={{ y: head, opacity: visible }}
      />
    </>
  );
}

/** useSearchParams needs a Suspense boundary; the fallback renders the same links without query-aware states. */
function NavLinksWithSearch(props: Omit<Parameters<typeof NavLinks>[0], "search">) {
  const search = useSearchParams();
  return <NavLinks {...props} search={new URLSearchParams(search.toString())} />;
}

function OnlineNow({ initialUsers, narrow }: { initialUsers: OnlineUser[]; narrow: boolean }) {
  const users = useOnlineUsers(initialUsers);
  if (users.length === 0) return null;
  return (
    <div className="flex h-[28px] items-center gap-[12px] px-[14px] text-[12px] text-nav-text/70" title={users.map((u) => u.name).join(", ")}>
      <span className="flex w-[16px] shrink-0 justify-center">
        <span className="relative flex h-[7px] w-[7px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
          <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald" />
        </span>
      </span>
      <span className={fade(narrow)}>{users.length} online</span>
      <span className={`ml-auto flex -space-x-[6px] ${fade(narrow)}`}>
        {users.slice(0, 4).map((u) => (
          <span key={u.staffId} className="rounded-full ring-2 ring-sidebar">
            <Avatar name={u.name} size={18} />
          </span>
        ))}
      </span>
    </div>
  );
}

export default function AdminSidebar({
  user,
  access,
  onlineUsers,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  user: { name: string; email: string; role: string };
  access: SidebarAccess;
  onlineUsers: OnlineUser[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const sections = buildSections(access, user.name);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  // The drawer is always full width; only the docked desktop sidebar collapses.
  const narrow = collapsed && !mobileOpen;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed bottom-[8px] left-[8px] top-[8px] z-50 flex flex-col overflow-hidden rounded-[12px] border border-sidebar-border bg-sidebar text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-[width,transform] duration-300 ${EASE} motion-reduce:transition-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+16px)]"
        } ${narrow ? "w-[60px]" : "w-[240px]"}`}
      >
        <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-sidebar-border px-[17px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer 400s on this asset under our basePath. */}
          <img src={`${basePath}/logo-it.jpg`} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 rounded-[6px] object-cover" />
          <div className={`flex min-w-0 flex-col leading-tight ${fade(narrow)}`}>
            <span className="text-[13px] font-semibold">PHN Helpdesk</span>
            <span className="text-[11px] text-nav-text/60">IT Service Desk</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] text-nav-text hover:bg-white/10 md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav aria-label="Admin" className="no-scrollbar relative flex flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden px-[8px] pb-[8px]">
          <Suspense fallback={<NavLinks sections={sections} narrow={narrow} onNavigate={onCloseMobile} search={new URLSearchParams()} />}>
            <NavLinksWithSearch sections={sections} narrow={narrow} onNavigate={onCloseMobile} />
          </Suspense>
        </nav>

        <div className="flex shrink-0 flex-col gap-[4px] border-t border-sidebar-border px-[8px] py-[8px]">
          <OnlineNow initialUsers={onlineUsers} narrow={narrow} />
          <div className="flex h-[40px] items-center gap-[10px] pl-[9px]" title={narrow ? user.name : undefined}>
            <Avatar name={user.name} size={26} />
            <div className={`flex min-w-0 flex-col leading-tight ${fade(narrow)}`}>
              <span className="truncate text-[13px] font-medium">{user.name}</span>
              <span className="truncate text-[11px] text-nav-text/60">{user.role}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-[32px] items-center gap-[12px] rounded-[6px] px-[14px] text-[12px] text-nav-text/70 transition-colors hover:bg-white/[0.06] hover:text-white md:flex"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.75} className="shrink-0" />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.75} className="shrink-0" />
            )}
            <span className={fade(narrow)}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
