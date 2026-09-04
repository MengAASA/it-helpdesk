"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export default function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== "All";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border px-[10.5px] py-[7.5px] text-[10.5px] font-medium capitalize outline-none transition-colors focus:border-[color:var(--color-blue)] ${
          isActive
            ? "border-[color:var(--color-blue)]/40 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]"
            : "border-card-border bg-paper text-ink hover:border-[color:var(--color-blue)]/30"
        }`}
      >
        {isActive ? value : `${label}: All`}
        <ChevronDown
          size={12}
          strokeWidth={2.25}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[264px] min-w-full origin-top overflow-y-auto rounded-[10px] border border-card-border bg-white py-[4px] shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
          >
            <DropdownOption label={`${label}: All`} selected={value === "All"} onClick={() => { onChange("All"); setOpen(false); }} />
            {options.map((o) => (
              <DropdownOption
                key={o}
                label={o}
                selected={value === o}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-[12px] whitespace-nowrap px-[12px] py-[7.5px] text-left text-[10.5px] font-medium capitalize transition-colors ${
        selected ? "bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]" : "text-ink hover:bg-result-bg/60"
      }`}
    >
      {label}
      {selected && <Check size={12} strokeWidth={2.5} />}
    </button>
  );
}
