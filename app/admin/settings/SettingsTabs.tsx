"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, TimerReset, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { key: "email" | "sla" | "templates"; label: string; icon: LucideIcon }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sla", label: "SLA", icon: TimerReset },
  { key: "templates", label: "Templates", icon: FileText },
];

export default function SettingsTabs({
  email,
  sla,
  templates,
}: {
  email: React.ReactNode;
  sla: React.ReactNode;
  templates: React.ReactNode;
}) {
  const [active, setActive] = useState<"email" | "sla" | "templates">("email");
  const [direction, setDirection] = useState(1);

  function selectTab(key: "email" | "sla" | "templates") {
    if (key === active) return;
    const nextIndex = TABS.findIndex((t) => t.key === key);
    const currentIndex = TABS.findIndex((t) => t.key === active);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActive(key);
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <nav className="flex w-fit items-center gap-[3px] rounded-[11px] border border-card-border bg-white p-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key)}
              className={`relative inline-flex items-center gap-[7px] rounded-[8px] px-[13.5px] py-[7.5px] text-[10.5px] font-semibold transition-colors ${
                isActive ? "text-paper" : "text-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="settings-tab-highlight"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-[8px] bg-admin-gradient"
                />
              )}
              <span className="relative inline-flex items-center gap-[7px]">
                <Icon size={14} strokeWidth={2.25} />
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            initial={{ x: direction * 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -32, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {active === "email" ? email : active === "sla" ? sla : templates}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
