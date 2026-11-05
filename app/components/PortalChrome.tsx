"use client";

import { usePathname } from "next/navigation";

/** Renders the staff portal's header/footer everywhere except /admin, which has its own sidebar shell. */
export default function PortalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
