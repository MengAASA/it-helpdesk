"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Ticket, BarChart3, ShieldCheck, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TEAMS } from "@/app/lib/teams";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type Permissions = {
  manageTickets: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  team: string | null;
};

const TOGGLES: {
  key: "manageTickets" | "viewReports" | "manageUsers";
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "manageTickets",
    label: "Manage tickets",
    description: "Change ticket status, assign tickets, and add internal notes.",
    icon: Ticket,
  },
  {
    key: "viewReports",
    label: "View reports",
    description: "Access the Reports tab with ticket volume and status breakdowns.",
    icon: BarChart3,
  },
  {
    key: "manageUsers",
    label: "Manage users",
    description: "Access the Users tab and edit other people's permissions here.",
    icon: ShieldCheck,
  },
];

export default function PermissionsForm({
  staffId,
  userName,
  userEmail,
  initialPermissions,
  isSelf,
}: {
  staffId: string;
  userName: string;
  userEmail: string;
  initialPermissions: Permissions;
  isSelf: boolean;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [permissions, setPermissions] = useState(initialPermissions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const changes: string[] = [];
  for (const t of TOGGLES) {
    if (initialPermissions[t.key] !== permissions[t.key]) {
      changes.push(`${t.label}: ${initialPermissions[t.key] ? "On" : "Off"} → ${permissions[t.key] ? "On" : "Off"}`);
    }
  }
  if (initialPermissions.team !== permissions.team) {
    changes.push(
      `Team: ${initialPermissions.team ?? "Unassigned"} → ${permissions.team ?? "Unassigned"}`
    );
  }
  const isRevoking = TOGGLES.some((t) => initialPermissions[t.key] && !permissions[t.key]);

  function toggle(key: "manageTickets" | "viewReports" | "manageUsers") {
    if (isSelf && key === "manageUsers" && permissions.manageUsers) {
      setError("You can't remove your own ability to manage users.");
      return;
    }
    setError(null);
    setSaved(false);
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setTeam(team: string | null) {
    setError(null);
    setSaved(false);
    setPermissions((prev) => ({ ...prev, team }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/permissions/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...permissions, name: userName, email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save permissions");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[15px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-[9px] border-b border-divider pb-[15px]">
        <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
          <Users2 size={11} strokeWidth={2.25} />
          Team assignment
        </span>
        <div className="flex flex-wrap items-center gap-[6px]">
          <button
            type="button"
            onClick={() => setTeam(null)}
            className={`rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold transition-colors ${
              permissions.team === null
                ? "border-card-border bg-ink text-paper"
                : "border-card-border bg-paper text-muted hover:border-primary/40 hover:text-primary"
            }`}
          >
            Unassigned
          </button>
          {TEAMS.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setTeam(team)}
              className={`rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold transition-colors ${
                permissions.team === team
                  ? "border-[color:var(--color-violet)] bg-[color:var(--color-violet)] text-paper"
                  : "border-card-border bg-paper text-muted hover:border-primary/40 hover:text-primary"
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
        System permissions
      </span>

      <div className="flex flex-col divide-y divide-divider">
        {TOGGLES.map((t) => {
          const Icon = t.icon;
          const enabled = permissions[t.key];
          return (
            <div key={t.key} className="flex items-start justify-between gap-[18px] py-[13.5px] first:pt-0 last:pb-0">
              <div className="flex items-start gap-[10.5px]">
                <span className="mt-[1.5px] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[8px] bg-result-bg text-primary">
                  <Icon size={13} strokeWidth={2.25} />
                </span>
                <div className="flex flex-col gap-[1.5px]">
                  <span className="text-[11.25px] font-semibold text-ink">{t.label}</span>
                  <p className="max-w-[420px] text-[9.75px] leading-[1.5] text-muted">{t.description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(t.key)}
                className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-primary" : "bg-card-border"
                }`}
              >
                <span
                  className="absolute top-[3px] left-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.25)] transition-transform"
                  style={{ transform: enabled ? "translateX(16px)" : "translateX(0)" }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          {error}
        </div>
      )}

      <div className="flex items-center gap-[10.5px]">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={saving || changes.length === 0}
          className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
        >
          <Check size={12} strokeWidth={2.5} />
          {saving ? "Saving…" : "Save permissions"}
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

      <ConfirmDialog
        open={confirmOpen}
        title="Save permission changes?"
        description={
          isRevoking
            ? "You're about to reduce this user's access. They'll lose these abilities immediately."
            : "These changes take effect immediately for this user."
        }
        danger={isRevoking}
        loading={saving}
        confirmLabel="Save changes"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await handleSave();
          setConfirmOpen(false);
        }}
      >
        <ul className="flex flex-col gap-[4.5px] rounded-[9px] bg-paper px-[12px] py-[9px] text-[10.5px] text-ink">
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
