"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Mail, Mails, TimerReset } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsTabKey = "email" | "sla" | "templates" | "emailTemplates";

/** What each area's tab says about it right now, worked out on the server from saved settings. */
export type TabSummary = {
  /** "On", "Off", or a count. */
  state: string;
  /** Whether the state reads as on/active (lime dot) or off (dim dot). */
  on: boolean;
  detail: string;
};

const TABS: { key: SettingsTabKey; label: string; icon: LucideIcon }[] = [
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
  summaries,
}: {
  email: React.ReactNode;
  sla: React.ReactNode;
  templates: React.ReactNode;
  emailTemplates: React.ReactNode;
  summaries: Partial<Record<SettingsTabKey, TabSummary>>;
}) {
  const panels = { email, sla, templates, emailTemplates };
  const visibleTabs = TABS.filter((t) => panels[t.key]);
  const [active, setActive] = useState<SettingsTabKey>(visibleTabs[0]?.key ?? "email");

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Dark switcher: each tab also shows where that area stands right now. */}
      <div className="@container">
        <div
          role="tablist"
          aria-label="Settings"
          className={`tile-ink grid grid-cols-2 gap-[4px] rounded-[16px] p-[6px] ${
            visibleTabs.length >= 3 ? "@min-[860px]:grid-cols-4" : ""
          }`}
        >
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            const s = summaries[t.key];
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`settings-tab-${t.key}`}
                aria-selected={isActive}
                aria-controls={`settings-panel-${t.key}`}
                onClick={() => setActive(t.key)}
                className={`group/tab relative flex min-w-0 flex-col gap-[10px] rounded-[12px] px-[14px] py-[12px] text-left transition-colors duration-150 ${
                  isActive ? "" : "hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="settings-tab"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    className="absolute inset-0 rounded-[12px] bg-white/[0.09] ring-1 ring-white/[0.12]"
                  />
                )}
                <span className="relative flex items-center justify-between gap-[8px]">
                  <span className={`flex min-w-0 items-center gap-[8px] text-[13px] font-semibold ${isActive ? "text-ink" : "text-muted"}`}>
                    <Icon size={15} strokeWidth={1.75} className={`shrink-0 ${isActive ? "text-primary-light" : "text-faint"}`} />
                    <span className="truncate">{t.label}</span>
                  </span>
                  {s && (
                    <span className="inline-flex items-center gap-[6px] text-[12px] font-medium tabular-nums text-ink">
                      <span className={`h-[6px] w-[6px] rounded-full ${s.on ? "bg-lime-bright" : "bg-white/30"}`} aria-hidden="true" />
                      {s.state}
                    </span>
                  )}
                </span>
                {s && <span className="relative truncate text-[12px] tabular-nums text-muted-2">{s.detail}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* A short fade only: no sliding, and no clipping wrapper that would cut off open menus. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          id={`settings-panel-${active}`}
          aria-labelledby={`settings-tab-${active}`}
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
