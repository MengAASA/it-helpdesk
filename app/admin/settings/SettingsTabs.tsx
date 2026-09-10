"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, TimerReset, FileText, Mails } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { key: "email" | "sla" | "templates" | "emailTemplates"; label: string; icon: LucideIcon }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sla", label: "SLA", icon: TimerReset },
  { key: "templates", label: "Canned replies", icon: FileText },
  { key: "emailTemplates", label: "Email templates", icon: Mails },
];

export default function SettingsTabs({
  email,
  sla,
  templates,
  emailTemplates,
}: {
  email: React.ReactNode;
  sla: React.ReactNode;
  templates: React.ReactNode;
  emailTemplates: React.ReactNode;
}) {
  const panels = { email, sla, templates, emailTemplates };
  const visibleTabs = TABS.filter((t) => panels[t.key]);
  const [active, setActive] = useState<"email" | "sla" | "templates" | "emailTemplates">(
    visibleTabs[0]?.key ?? "email"
  );
  const [direction, setDirection] = useState(1);

  function selectTab(key: "email" | "sla" | "templates" | "emailTemplates") {
    if (key === active) return;
    const nextIndex = visibleTabs.findIndex((t) => t.key === key);
    const currentIndex = visibleTabs.findIndex((t) => t.key === active);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActive(key);
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <nav className="flex w-fit items-center gap-[3px] rounded-[11px] border border-card-border bg-white p-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {visibleTabs.map((t) => {
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
            {active === "email"
              ? email
              : active === "sla"
                ? sla
                : active === "templates"
                  ? templates
                  : emailTemplates}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
