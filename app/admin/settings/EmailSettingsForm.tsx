"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import {
  Field,
  Flash,
  Group,
  Notice,
  OnOff,
  Panel,
  PanelFooter,
  PanelHeader,
  Switch,
  SwitchRow,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "./settingsParts";

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
  notifySlaBreach: boolean;
};

const NOTIFY_TOGGLES: {
  key: "notifyAssigned" | "notifyStatusChanged" | "notifyNewReply" | "notifySlaBreach";
  label: string;
}[] = [
  { key: "notifyAssigned", label: "Ticket assigned to someone" },
  { key: "notifyStatusChanged", label: "Ticket status changes" },
  { key: "notifyNewReply", label: "New reply visible to requester" },
  { key: "notifySlaBreach", label: "Ticket breaches its SLA target" },
];

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

  const activeCount = NOTIFY_TOGGLES.filter((t) => settings[t.key]).length;

  return (
    <Panel>
      <PanelHeader
        title="Email notifications"
        description="Sends an email when a ticket is assigned, its status changes, or a requester gets a reply. Set up your SMTP server here, no code or redeploy needed."
        action={
          <div className="flex shrink-0 items-center gap-[10px] pt-[2px]">
            <OnOff on={settings.enabled} />
            <Switch checked={settings.enabled} onChange={(v) => update("enabled", v)} label="Email notifications" />
          </div>
        }
      />

      <Group title="SMTP server" description="The mail server outgoing emails go through.">
        <div className="grid grid-cols-1 gap-[12px] @min-[480px]:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="SMTP host">
            <input value={settings.host} onChange={(e) => update("host", e.target.value)} placeholder="smtp.office365.com" className={inputClass} />
          </Field>
          <Field label="Port">
            <input
              type="number"
              value={settings.port ?? ""}
              onChange={(e) => update("port", e.target.value ? Number(e.target.value) : null)}
              placeholder="587"
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-[12px] @min-[480px]:grid-cols-2">
          <Field label="Username">
            <input value={settings.username} onChange={(e) => update("username", e.target.value)} placeholder="helpdesk@phn.com" className={inputClass} />
          </Field>
          <Field label="Password" hint={savedHasPassword ? "Leave blank to keep current" : undefined}>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={savedHasPassword ? "••••••••" : ""}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </div>
        <SwitchRow label="Use TLS/SSL" hint="Usually port 465" checked={settings.secure} onChange={(v) => update("secure", v)} />
      </Group>

      <Group title="Sender" description="Who the emails appear to come from.">
        <div className="grid grid-cols-1 gap-[12px] @min-[480px]:grid-cols-2">
          <Field label="From name">
            <input value={settings.fromName} onChange={(e) => update("fromName", e.target.value)} placeholder="PHN Helpdesk" className={inputClass} />
          </Field>
          <Field label="From email">
            <input value={settings.fromEmail} onChange={(e) => update("fromEmail", e.target.value)} placeholder="helpdesk@phn.com" className={inputClass} />
          </Field>
        </div>
        <InboxPreview fromName={settings.fromName} fromEmail={settings.fromEmail} host={settings.host} port={settings.port} secure={settings.secure} />
      </Group>

      <Group title="Send an email when…" description={`${activeCount} of ${NOTIFY_TOGGLES.length} events on.`}>
        <div className="-my-[6px] flex flex-col divide-y divide-card-border/60">
          {NOTIFY_TOGGLES.map((t) => (
            <SwitchRow key={t.key} label={t.label} checked={settings[t.key]} onChange={(v) => update(t.key, v)} />
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
          <>
            <Flash show={saved} tone="ok">
              Saved
            </Flash>
            <Flash show={testResult === "ok"} tone="ok">
              Test email sent. Check your inbox.
            </Flash>
            <Flash show={testResult === "error"} tone="error">
              Test email failed to send. Check your settings and try again.
            </Flash>
          </>
        }
      >
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !settings.enabled}
          title={settings.enabled ? undefined : "Turn email notifications on first"}
          className={btnSecondary}
        >
          {testing ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <Send size={14} strokeWidth={1.75} />}
          {testing ? "Sending…" : "Send test email"}
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
          {saving ? "Saving…" : "Save settings"}
        </button>
      </PanelFooter>
    </Panel>
  );
}

/** How the sender will look in someone's inbox, updated as the fields are typed. */
function InboxPreview({
  fromName,
  fromEmail,
  host,
  port,
  secure,
}: {
  fromName: string;
  fromEmail: string;
  host: string;
  port: number | null;
  secure: boolean;
}) {
  const name = fromName.trim() || "PHN Helpdesk";
  const email = fromEmail.trim() || "helpdesk@phn.com";
  return (
    <div className="tile-ink rounded-[12px] p-[14px]">
      <div className="mb-[10px] flex items-center justify-between gap-[12px] text-[12px] text-muted-2">
        <span>Inbox preview</span>
        <span className="truncate font-mono-plex text-[11px]">
          {host.trim() ? `${host.trim()}${port ? `:${port}` : ""}` : "no server yet"}
          {secure ? " · TLS" : ""}
        </span>
      </div>
      <div className="flex items-start gap-[10px] rounded-[10px] bg-white/[0.06] p-[10px]">
        <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-baseline justify-between gap-[8px]">
            <span className="min-w-0 truncate text-[13px]">
              <span className="font-semibold text-ink">{name}</span> <span className="text-muted-2">&lt;{email}&gt;</span>
            </span>
            <span className="shrink-0 text-[11px] text-faint">now</span>
          </div>
          <span className="truncate text-[13px] text-ink">[TCK-7K3F-9Q2M] Assigned to you: Laptop won&apos;t turn on</span>
          <span className="truncate text-[12px] text-muted-2">Hi Jane, ticket TCK-7K3F-9Q2M has been assigned to you…</span>
        </div>
      </div>
    </div>
  );
}
