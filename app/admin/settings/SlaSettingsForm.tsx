"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2 } from "lucide-react";
import { PriorityBadge } from "@/app/components/TicketBadges";
import { Flash, Group, Notice, OnOff, Panel, PanelFooter, PanelHeader, Switch, btnPrimary, inputClass } from "./settingsParts";

type SlaHours = { Low: number; Normal: number; High: number; enabled: boolean };

const FIELDS: { key: "Low" | "Normal" | "High"; label: string }[] = [
  { key: "High", label: "High priority" },
  { key: "Normal", label: "Normal priority" },
  { key: "Low", label: "Low priority" },
];

/** 4 → "Same day", 24 → "1 day", 36 → "1.5 days". */
function inDays(hours: number): string {
  if (hours < 24) return "Same day";
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

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
    <div className="flex flex-col gap-[16px]">
      <Panel>
        <PanelHeader
          title="SLA targets"
          description="How many hours a ticket can stay open, per priority, before it's flagged overdue on the tickets table and dashboard."
          action={
            <div className="flex shrink-0 items-center gap-[10px] pt-[2px]">
              <OnOff on={hours.enabled} />
              <Switch checked={hours.enabled} onChange={setEnabled} label="SLA tracking" />
            </div>
          }
        />

        {!hours.enabled && (
          <div className="px-[20px] pb-[16px]">
            <Notice tone="warning">SLA tracking is off. No tickets will be flagged overdue until you turn it back on.</Notice>
          </div>
        )}

        <Group title="Targets" description="Hours from when a ticket is created until it counts as overdue.">
          <div className={`grid grid-cols-1 gap-[10px] transition-opacity @min-[560px]:grid-cols-3 ${hours.enabled ? "" : "pointer-events-none opacity-40"}`}>
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-[10px] rounded-[12px] border border-card-border/70 bg-surface-2/40 p-[12px]">
                <span className="flex items-center justify-between gap-[8px]">
                  <PriorityBadge priority={f.key} />
                  <span className="text-[12px] tabular-nums text-muted-2">{inDays(hours[f.key])}</span>
                </span>
                <span className="relative">
                  <input
                    type="number"
                    min={1}
                    disabled={!hours.enabled}
                    value={hours[f.key]}
                    onChange={(e) => update(f.key, Number(e.target.value) || 1)}
                    aria-label={`${f.label} target in hours`}
                    className={`${inputClass} pr-[52px] text-[15px] font-semibold tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[12px] text-muted-2">hours</span>
                </span>
              </label>
            ))}
          </div>
        </Group>

        {error && (
          <div className="px-[20px] pb-[16px]">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <PanelFooter
          status={
            <Flash show={saved} tone="ok">
              Saved
            </Flash>
          }
        >
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
            {saving ? "Saving…" : "Save SLA targets"}
          </button>
        </PanelFooter>
      </Panel>

      <section aria-label="Breach notifications" className="tile-ink @container rounded-[16px] p-[20px]">
        <div className="flex flex-col gap-[16px] @min-[760px]:flex-row @min-[760px]:items-start @min-[760px]:gap-[32px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Breach notifications</h2>
            <p className="max-w-[520px] text-[13px] leading-[20px] text-muted">
              Emails the assignee (or the whole team, if unassigned) the first time a ticket breaches its SLA target. Each ticket is only
              notified once.
            </p>
            <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
              <button
                type="button"
                onClick={handleCheckNow}
                disabled={checking || !hours.enabled}
                className="inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-[8px] bg-white px-[12px] text-[13px] font-medium text-navy transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checking ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <BellRing size={14} strokeWidth={1.75} />}
                {checking ? "Checking…" : "Check for breaches now"}
              </button>
              {checkResult === "error" && <span className="text-[13px] text-chart-pink">Check failed. Try again.</span>}
              {checkResult && checkResult !== "error" && (
                <span className="inline-flex items-center gap-[6px] text-[13px] text-ink">
                  <span className="h-[6px] w-[6px] rounded-full bg-lime-bright" aria-hidden="true" />
                  {checkResult.checked} overdue ticket{checkResult.checked === 1 ? "" : "s"} found, {checkResult.notified} new notification
                  {checkResult.notified === 1 ? "" : "s"} sent.
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-[8px] @min-[760px]:w-[360px]">
            <span className="text-[12px] text-muted-2">Run it on a schedule</span>
            <pre className="overflow-x-auto rounded-[10px] border border-white/10 bg-black/25 px-[12px] py-[10px] font-mono-plex text-[12px] leading-[20px] text-ink">
              <span className="text-lime-bright">POST</span> /api/cron/sla-check{"\n"}
              <span className="text-muted-2">X-Cron-Secret:</span> $CRON_SECRET
            </pre>
            <span className="text-[12px] leading-[18px] text-muted-2">
              Point a scheduler such as Windows Task Scheduler at this, on any interval. The header must match your{" "}
              <code className="font-mono-plex text-[11px] text-muted">CRON_SECRET</code> env var.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
