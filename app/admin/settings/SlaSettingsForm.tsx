"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, TimerReset } from "lucide-react";

type SlaHours = { Low: number; Normal: number; High: number };

const FIELDS: { key: keyof SlaHours; label: string; toneClass: string }[] = [
  { key: "High", label: "High priority", toneClass: "text-[color:var(--color-rose-text)]" },
  { key: "Normal", label: "Normal priority", toneClass: "text-ink" },
  { key: "Low", label: "Low priority", toneClass: "text-[color:var(--color-emerald-text)]" },
];

export default function SlaSettingsForm({ initialHours }: { initialHours: SlaHours }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [hours, setHours] = useState(initialHours);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof SlaHours, value: number) {
    setHours((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/sla`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hours),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save SLA targets");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[18px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-[10.5px] border-b border-divider pb-[15px]">
        <span className="mt-[1.5px] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[8px] bg-result-bg text-primary">
          <TimerReset size={13} strokeWidth={2.25} />
        </span>
        <div className="flex flex-col gap-[1.5px]">
          <span className="text-[11.25px] font-semibold text-ink">SLA targets</span>
          <p className="max-w-[420px] text-[9.75px] leading-[1.5] text-muted">
            How many hours a ticket can stay open, per priority, before it&apos;s flagged overdue on the tickets
            table and dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[13.5px] sm:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-[4.5px]">
            <span className={`text-[9px] font-semibold uppercase tracking-[0.05em] ${f.toneClass}`}>{f.label}</span>
            <div className="flex items-center gap-[6px]">
              <input
                type="number"
                min={1}
                value={hours[f.key]}
                onChange={(e) => update(f.key, Number(e.target.value) || 1)}
                className="w-full rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[10.5px] text-ink outline-none focus:border-primary"
              />
              <span className="whitespace-nowrap text-[9.75px] text-faint">hours</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          {error}
        </div>
      )}

      <div className="flex items-center gap-[10.5px]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
        >
          <Check size={12} strokeWidth={2.5} />
          {saving ? "Saving…" : "Save SLA targets"}
        </button>
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="text-[9.75px] font-medium text-[color:var(--color-emerald-text)]"
            >
              Saved.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
