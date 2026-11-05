"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users2 } from "lucide-react";
import Avatar from "@/app/components/Avatar";
import { useDismiss } from "@/app/components/useDismiss";

export type AssigneeOption = { name: string; staffId: string | null; isTeamMember: boolean };

export default function AssigneeLookup({
  value,
  onChange,
  options,
  disabled,
  placement = "bottom",
}: {
  value: string;
  onChange: (name: string) => void;
  options: AssigneeOption[];
  disabled?: boolean;
  /** "top" opens the suggestion list upward, for inputs near the bottom of the screen. */
  placement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useDismiss(open, () => setOpen(false));

  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options)
    .slice()
    .sort((a, b) => Number(b.isTeamMember) - Number(a.isTeamMember));
  const up = placement === "top";

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
        }}
        onFocus={(e) => {
          setQuery("");
          setOpen(true);
          e.target.select();
        }}
        placeholder="Unassigned"
        disabled={disabled}
        autoComplete="off"
        className="h-[32px] w-full rounded-[8px] border border-field-border bg-surface hover:border-field-border-hover px-[10px] text-[13px] text-ink placeholder:text-faint outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <AnimatePresence>
        {open && !disabled && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: up ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: up ? 4 : -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute left-0 z-30 max-h-[240px] w-[260px] min-w-full overflow-y-auto rounded-[10px] border border-card-border bg-surface p-[4px] shadow-pop ${
              up ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
            }`}
          >
            {filtered.map((o) => (
              <button
                key={o.staffId ?? o.name}
                type="button"
                onClick={() => {
                  onChange(o.name);
                  setOpen(false);
                }}
                className="flex h-[32px] w-full items-center gap-[8px] rounded-[6px] px-[8px] text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
              >
                <Avatar name={o.name} size={20} />
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.isTeamMember && (
                  <span className="inline-flex shrink-0 items-center gap-[4px] rounded-[4px] bg-primary-soft px-[5px] text-[11px] font-medium leading-[18px] text-primary">
                    <Users2 size={11} strokeWidth={2} />
                    Team
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
