"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 20_000;

export type OnlineUser = { staffId: string; name: string };

/** Who is signed in right now, refreshed from /api/presence every 20 seconds. */
export function useOnlineUsers(initialUsers: OnlineUser[]): OnlineUser[] {
  const [users, setUsers] = useState(initialUsers);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${basePath}/api/presence`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.users)) setUsers(data.users);
      } catch {
        // Transient network hiccup, keep showing the last known list.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return users;
}
