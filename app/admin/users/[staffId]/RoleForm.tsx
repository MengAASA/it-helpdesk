"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ShieldCheck, UserRound } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const ROLES: { value: "user" | "admin"; label: string; icon: typeof ShieldCheck }[] = [
  { value: "user", label: "Staff", icon: UserRound },
  { value: "admin", label: "Admin", icon: ShieldCheck },
];

export default function RoleForm({
  staffId,
  userName,
  currentRole,
  isSelf,
}: {
  staffId: string;
  userName: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalizedInitial = currentRole === "admin" ? "admin" : "user";
  const [role, setRole] = useState<"user" | "admin">(normalizedInitial);
  const [savedRole, setSavedRole] = useState<"user" | "admin">(normalizedInitial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChange = role !== savedRole;
  const isDowngrade = savedRole === "admin" && role === "user";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/users/${staffId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update role");
      setSavedRole(role);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-[12px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
        IAMS role
      </span>

      {isSelf ? (
        <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          You can&apos;t change your own IAMS role from here.
        </div>
      ) : (
        <>
          <p className="text-[9.75px] leading-[1.5] text-muted">
            This changes the person&apos;s role directly in IAMS, not just in this helpdesk.
          </p>
          <div className="flex flex-wrap items-center gap-[6px]">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setRole(r.value);
                    setSaved(false);
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-[6px] rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-paper"
                      : "border-card-border bg-paper text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <Icon size={11} strokeWidth={2.25} />
                  {r.label}
                </button>
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
              disabled={saving || !hasChange}
              className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
            >
              <Check size={12} strokeWidth={2.5} />
              {saving ? "Saving…" : "Save role"}
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
            title="Change IAMS role?"
            description={`${userName}'s role will change from ${savedRole === "admin" ? "Admin" : "Staff"} to ${role === "admin" ? "Admin" : "Staff"} directly in IAMS.${
              isDowngrade ? " They'll immediately lose IAMS admin access." : ""
            }`}
            danger={isDowngrade}
            loading={saving}
            confirmLabel="Change role"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={handleSave}
          />
        </>
      )}
    </div>
  );
}
