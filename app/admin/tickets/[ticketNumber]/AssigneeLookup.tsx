"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users2 } from "lucide-react";

export type AssigneeOption = { name: string; staffId: string | null; isTeamMember: boolean };

export default function AssigneeLookup({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (name: string) => void;
  options: AssigneeOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

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

  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options)
    .slice()
    .sort((a, b) => Number(b.isTeamMember) - Number(a.isTeamMember));

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
        className="w-full rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[10.5px] text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      <AnimatePresence>
        {open && !disabled && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-[220px] w-[240px] min-w-full origin-top overflow-y-auto rounded-[10px] border border-card-border bg-white py-[4px] shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
          >
            {filtered.map((o) => (
              <button
                key={o.staffId ?? o.name}
                type="button"
                onClick={() => {
                  onChange(o.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-[9px] px-[12px] py-[7.5px] text-left text-[10.5px] font-medium text-ink transition-colors hover:bg-result-bg/60"
              >
                <span className="truncate">{o.name}</span>
                {o.isTeamMember && (
                  <span className="inline-flex shrink-0 items-center gap-[3px] rounded-full border border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] px-[6px] py-[1.5px] text-[7.5px] font-semibold uppercase tracking-[0.04em] text-[color:var(--color-violet-text)]">
                    <Users2 size={8} strokeWidth={2.5} />
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
