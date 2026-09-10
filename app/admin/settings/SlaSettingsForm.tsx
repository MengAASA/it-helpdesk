"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, TimerReset, BellRing } from "lucide-react";

type SlaHours = { Low: number; Normal: number; High: number; enabled: boolean };

const FIELDS: { key: "Low" | "Normal" | "High"; label: string; toneClass: string }[] = [
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
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ checked: number; notified: number } | "error" | null>(null);

  function update(key: "Low" | "Normal" | "High", value: number) {
    setHours((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setEnabled(enabled: boolean) {
    setHours((prev) => ({ ...prev, enabled }));
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

  async function handleCheckNow() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/sla/check-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed");
      setCheckResult({ checked: data.checked, notified: data.notified });
      router.refresh();
    } catch {
      setCheckResult("error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-[18px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-[18px] border-b border-divider pb-[15px]">
        <div className="flex items-start gap-[10.5px]">
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
        <button
          type="button"
          role="switch"
          aria-checked={hours.enabled}
          onClick={() => setEnabled(!hours.enabled)}
          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
            hours.enabled ? "bg-primary" : "bg-card-border"
          }`}
        >
          <span
            className="absolute top-[3px] left-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.25)] transition-transform"
            style={{ transform: hours.enabled ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {!hours.enabled && (
        <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          SLA tracking is off. No tickets will be flagged overdue until you turn it back on.
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-[13.5px] sm:grid-cols-3 transition-opacity ${
          hours.enabled ? "" : "pointer-events-none opacity-40"
        }`}
      >
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-[4.5px]">
            <span className={`text-[9px] font-semibold uppercase tracking-[0.05em] ${f.toneClass}`}>{f.label}</span>
            <div className="flex items-center gap-[6px]">
              <input
                type="number"
                min={1}
                disabled={!hours.enabled}
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

      <div className="flex flex-col gap-[10.5px] border-t border-divider pt-[15px]">
        <div className="flex items-start gap-[10.5px]">
          <span className="mt-[1.5px] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[8px] bg-result-bg text-primary">
            <BellRing size={13} strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[11.25px] font-semibold text-ink">Breach notifications</span>
            <p className="max-w-[420px] text-[9.75px] leading-[1.5] text-muted">
              Emails the assignee (or the whole team, if unassigned) the first time a ticket breaches its SLA
              target — each ticket is only notified once. To run this automatically, point a scheduler
              (e.g. Windows Task Scheduler) at <code className="text-[9px]">POST /api/cron/sla-check</code> with
              an <code className="text-[9px]">X-Cron-Secret</code> header matching your{" "}
              <code className="text-[9px]">CRON_SECRET</code> env var, on whatever interval you like. Or just
              check manually below.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-[10.5px]">
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={checking || !hours.enabled}
            className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border border-card-border bg-paper px-[15px] py-[7.5px] text-[9.75px] font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BellRing size={12} strokeWidth={2.25} />
            {checking ? "Checking…" : "Check for breaches now"}
          </button>
          <AnimatePresence>
            {checkResult === "error" && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-[9.75px] font-medium text-[color:var(--color-rose-text)]"
              >
                Check failed. Try again.
              </motion.span>
            )}
            {checkResult && checkResult !== "error" && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="text-[9.75px] font-medium text-[color:var(--color-emerald-text)]"
              >
                {checkResult.checked} overdue ticket{checkResult.checked === 1 ? "" : "s"} found,{" "}
                {checkResult.notified} new notification{checkResult.notified === 1 ? "" : "s"} sent.
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
