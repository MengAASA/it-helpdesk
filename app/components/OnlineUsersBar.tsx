"use client";

import { AnimatePresence, motion } from "framer-motion";
import Avatar from "./Avatar";
import { useOnlineUsers, type OnlineUser } from "./useOnlineUsers";

export default function OnlineUsersBar({ initialUsers }: { initialUsers: OnlineUser[] }) {
  const users = useOnlineUsers(initialUsers);

  return (
    <AnimatePresence initial={false}>
      {users.length > 0 && (
        <motion.div
          key="bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="tile-ink overflow-hidden border-b border-white/10"
        >
          <div className="flex flex-wrap items-center gap-[10px] px-[16px] py-[10px] text-[12px] text-muted md:px-[32px]">
            <span className="inline-flex items-center gap-[6px] font-medium text-ink">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald" />
              </span>
              {users.length} online now
            </span>
            <div className="flex flex-wrap items-center gap-[6px]">
              <AnimatePresence initial={false}>
                {users.map((u) => (
                  <motion.span
                    key={u.staffId}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="inline-flex items-center gap-[6px] rounded-full bg-white/[0.08] py-[2px] pl-[2px] pr-[10px] text-ink"
                  >
                    <Avatar name={u.name} size={20} />
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
