"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Avatar from "./Avatar";

const POLL_INTERVAL_MS = 20_000;

type OnlineUser = { staffId: string; name: string };

export default function OnlineUsersBar({ initialUsers }: { initialUsers: OnlineUser[] }) {
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
        // Transient network hiccup — keep showing the last known list.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence initial={false}>
      {users.length > 0 && (
        <motion.div
          key="bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden border-t border-white/10 bg-nav-gradient"
        >
          <div className="flex flex-wrap items-center gap-[10.5px] px-[42px] py-[10.5px] text-[9.75px] text-nav-text">
            <span className="inline-flex items-center gap-[6px] font-semibold text-paper">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-emerald)] opacity-75" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[color:var(--color-emerald)]" />
              </span>
              {users.length} online now
            </span>
            <div className="flex flex-wrap items-center gap-[7.5px]">
              <AnimatePresence initial={false}>
                {users.map((u) => (
                  <motion.span
                    key={u.staffId}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="inline-flex items-center gap-[6px] rounded-full bg-white/10 py-[3px] pl-[3px] pr-[10.5px]"
                  >
                    <Avatar name={u.name} size={17} />
                    {u.name}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
