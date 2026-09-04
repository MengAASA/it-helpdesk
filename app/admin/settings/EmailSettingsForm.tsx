"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Mail, Send, ShieldCheck } from "lucide-react";

type Settings = {
  enabled: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  notifyAssigned: boolean;
  notifyStatusChanged: boolean;
  notifyNewReply: boolean;
};

const NOTIFY_TOGGLES: { key: "notifyAssigned" | "notifyStatusChanged" | "notifyNewReply"; label: string }[] = [
  { key: "notifyAssigned", label: "Ticket assigned to someone" },
  { key: "notifyStatusChanged", label: "Ticket status changes" },
  { key: "notifyNewReply", label: "New reply visible to requester" },
];

const inputClass =
  "w-full rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[10.5px] text-ink outline-none focus:border-primary";

export default function EmailSettingsForm({
  initialSettings,
  hasPassword,
}: {
  initialSettings: Settings;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [settings, setSettings] = useState(initialSettings);
  const [savedHasPassword, setSavedHasPassword] = useState(hasPassword);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      setSaved(true);
      if (settings.password.trim()) setSavedHasPassword(true);
      setSettings((prev) => ({ ...prev, password: "" }));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${basePath}/api/admin/settings/email/test`, { method: "POST" });
      setTestResult(res.ok ? "ok" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-[18px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-[18px] border-b border-divider pb-[15px]">
        <div className="flex items-start gap-[10.5px]">
          <span className="mt-[1.5px] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[8px] bg-result-bg text-primary">
            <Mail size={13} strokeWidth={2.25} />
          </span>
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[11.25px] font-semibold text-ink">Email notifications</span>
            <p className="max-w-[420px] text-[9.75px] leading-[1.5] text-muted">
              Sends an email when a ticket is assigned, its status changes, or a requester gets a reply. Configure
              your SMTP server here — no code or redeploy needed.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => update("enabled", !settings.enabled)}
          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
            settings.enabled ? "bg-primary" : "bg-card-border"
          }`}
        >
          <span
            className="absolute top-[3px] left-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.25)] transition-transform"
            style={{ transform: settings.enabled ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-[13.5px] sm:grid-cols-2">
        <Field label="SMTP host">
          <input
            value={settings.host}
            onChange={(e) => update("host", e.target.value)}
            placeholder="smtp.office365.com"
            className={inputClass}
          />
        </Field>
        <Field label="SMTP port">
          <input
            type="number"
            value={settings.port ?? ""}
            onChange={(e) => update("port", e.target.value ? Number(e.target.value) : null)}
            placeholder="587"
            className={inputClass}
          />
        </Field>
        <Field label="Username">
          <input
            value={settings.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="helpdesk@phn.com"
            className={inputClass}
          />
        </Field>
        <Field label={savedHasPassword ? "Password (leave blank to keep current)" : "Password"}>
          <input
            type="password"
            value={settings.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder={savedHasPassword ? "••••••••" : ""}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="From name">
          <input
            value={settings.fromName}
            onChange={(e) => update("fromName", e.target.value)}
            placeholder="PHN Helpdesk"
            className={inputClass}
          />
        </Field>
        <Field label="From email">
          <input
            value={settings.fromEmail}
            onChange={(e) => update("fromEmail", e.target.value)}
            placeholder="helpdesk@phn.com"
            className={inputClass}
          />
        </Field>
      </div>

      <label className="inline-flex w-fit cursor-pointer items-center gap-[7.5px] text-[9.75px] font-medium text-muted">
        <input
          type="checkbox"
          checked={settings.secure}
          onChange={(e) => update("secure", e.target.checked)}
          className="h-[12px] w-[12px] accent-primary"
        />
        Use TLS/SSL (usually port 465)
      </label>

      <div className="flex flex-col gap-[7.5px] border-t border-divider pt-[13.5px]">
        <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">Send an email when…</span>
        <div className="flex flex-col gap-[6px]">
          {NOTIFY_TOGGLES.map((t) => (
            <label
              key={t.key}
              className="inline-flex w-fit cursor-pointer items-center gap-[7.5px] text-[9.75px] font-medium text-muted"
            >
              <input
                type="checkbox"
                checked={settings[t.key]}
                onChange={(e) => update(t.key, e.target.checked)}
                className="h-[12px] w-[12px] accent-primary"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[10.5px]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
        >
          <Check size={12} strokeWidth={2.5} />
          {saving ? "Saving…" : "Save settings"}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !settings.enabled}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border border-card-border bg-paper px-[15px] py-[7.5px] text-[9.75px] font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={12} strokeWidth={2.25} />
          {testing ? "Sending…" : "Send test email"}
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
        <AnimatePresence>
          {testResult === "ok" && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-[4.5px] text-[9.75px] font-medium text-[color:var(--color-emerald-text)]"
            >
              <ShieldCheck size={11} strokeWidth={2.5} /> Test email sent — check your inbox.
            </motion.span>
          )}
          {testResult === "error" && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="text-[9.75px] font-medium text-[color:var(--color-rose-text)]"
            >
              Test email failed to send. Check your settings and try again.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[4.5px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-2">{label}</span>
      {children}
    </div>
  );
}
