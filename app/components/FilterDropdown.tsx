"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useDismiss } from "./useDismiss";

export default function FilterDropdown({
  label,
  value,
  onChange,
  options,
  optionLabel = (v) => v,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** How an option value is shown, e.g. "sla_breach" as "SLA breach". Filtering still uses the value. */
  optionLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const isActive = value !== "All";

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-[30px] items-center gap-[6px] whitespace-nowrap rounded-[8px] border px-[10px] text-[13px] transition-colors ${
          isActive
            ? "border-primary/25 bg-primary-soft text-primary"
            : "border-field-border bg-surface hover:border-field-border-hover text-muted hover:bg-surface-2 hover:text-ink"
        }`}
      >
        {label}
        {isActive && <span className="max-w-[160px] truncate font-medium capitalize">: {optionLabel(value)}</span>}
        <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[280px] min-w-full overflow-y-auto rounded-[10px] border border-card-border bg-surface p-[4px] shadow-pop"
          >
            <DropdownOption label={`Any ${label.toLowerCase()}`} selected={value === "All"} onClick={() => choose("All")} />
            {options.map((o) => (
              <DropdownOption key={o} label={optionLabel(o)} selected={value === o} onClick={() => choose(o)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className="flex h-[30px] w-full items-center justify-between gap-[16px] whitespace-nowrap rounded-[6px] px-[8px] text-left text-[13px] capitalize text-ink transition-colors hover:bg-surface-2"
    >
      {label}
      {selected && <Check size={14} strokeWidth={2} className="text-primary" />}
    </button>
  );
}
