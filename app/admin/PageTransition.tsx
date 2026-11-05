"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } }}
          // The old page steps aside quickly so the two never read as overlapping.
          exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
