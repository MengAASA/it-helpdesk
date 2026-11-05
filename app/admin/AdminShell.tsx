"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import AdminSidebar, { type SidebarAccess } from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import type { OnlineUser } from "@/app/components/useOnlineUsers";
import { SIDEBAR_COOKIE } from "@/app/lib/theme";
import { SidebarCollapsedContext } from "./SidebarFlip";

export default function AdminShell({
  user,
  access,
  onlineUsers,
  initialCollapsed,
  children,
}: {
  user: { name: string; email: string; role: string };
  access: SidebarAccess;
  onlineUsers: OnlineUser[];
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Room for the floating sidebar on desktop: its width plus the 8px float gap on each side and
  // a 24px gutter (240 + 16 + 24, or 60 + 16 + 24 collapsed). Eased to match the sidebar itself.
  const inset = `transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
    collapsed ? "md:pl-[100px]" : "md:pl-[280px]"
  }`;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      // A cookie (not localStorage) so the server renders the right width on the next load.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    // reducedMotion="user" turns every framer-motion animation in the shell off for people who ask their OS for less motion.
    <MotionConfig reducedMotion="user">
    <SidebarCollapsedContext.Provider value={collapsed}>
    <div className="flex min-h-screen w-full flex-1 flex-col">
      <div aria-hidden="true" className="app-backdrop pointer-events-none fixed inset-0 -z-10" />
      {/* Fixed and above everything else, so the full-width top bar runs underneath it. */}
      <AdminSidebar
        user={user}
        access={access}
        onlineUsers={onlineUsers}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <AdminTopBar user={user} onOpenMobile={() => setMobileOpen(true)} insetClassName={inset} />
      {/* Pages with FLIP blocks (the dashboard masonry) animate their own content, so the padding snaps there. */}
      <main
        className={`flex w-full min-w-0 flex-1 flex-col gap-[20px] px-[16px] py-[20px] md:py-[24px] md:pr-[24px] ${inset} has-[[data-sidebar-flip]]:transition-none`}
      >
        {children}
      </main>
    </div>
    </SidebarCollapsedContext.Provider>
    </MotionConfig>
  );
}
