"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TabKey = "tickets" | "settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tickets", label: "Tickets" },
  { key: "settings", label: "Settings" },
];

/** Segmented switch between the two logs, matching the status tabs on the tickets list. */
export default function ActivityTabs({
  tickets,
  settings,
  counts,
}: {
  tickets: React.ReactNode;
  settings: React.ReactNode;
  counts: Record<TabKey, number>;
}) {
  const panels = { tickets, settings };
  const [active, setActive] = useState<TabKey>("tickets");

  return (
    <div className="flex flex-col gap-[12px]">
      <div
        role="tablist"
        aria-label="Activity log"
        className="inline-flex h-[32px] w-fit items-center rounded-[9px] border border-field-border bg-surface-2 p-[2px]"
      >
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`activity-tab-${t.key}`}
              aria-selected={isActive}
              aria-controls={`activity-panel-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`relative flex h-[26px] items-center whitespace-nowrap rounded-[7px] px-[10px] text-[13px] transition-colors ${
                isActive ? "text-ink" : "text-muted-2 hover:text-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activity-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-[7px] bg-surface shadow-card"
                />
              )}
              <span className="relative flex items-center gap-[6px]">
                {t.label}
                <span className={`text-[12px] tabular-nums ${isActive ? "text-muted-2" : "text-faint"}`}>{counts[t.key]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* A short fade only: no sliding, and no clipping wrapper that would cut off open menus. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          id={`activity-panel-${active}`}
          aria-labelledby={`activity-tab-${active}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {panels[active]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
