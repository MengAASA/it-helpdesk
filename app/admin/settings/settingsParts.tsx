"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle } from "lucide-react";

/*
 * Building blocks shared by the settings panels, so every form on the page has the same field
 * sizes, switches, buttons and footer.
 */

export const inputClass =
  "h-[32px] w-full rounded-[8px] border border-field-border bg-surface px-[10px] text-[13px] text-ink outline-none transition-colors placeholder:text-faint hover:border-field-border-hover disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClass =
  "w-full resize-y rounded-[8px] border border-field-border bg-surface px-[10px] py-[8px] text-[13px] leading-[20px] text-ink outline-none transition-colors placeholder:text-faint hover:border-field-border-hover";

export const btnPrimary =
  "inline-flex h-[32px] shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex h-[32px] shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex h-[32px] shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded-[8px] px-[10px] text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export const iconBtn =
  "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-faint transition-colors hover:bg-surface-2 hover:text-ink";

/** The white card each settings area sits in. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`@container rounded-[16px] border border-card-border/50 bg-surface ${className}`}>{children}</section>;
}

export function PanelHeader({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-[16px] px-[20px] pb-[16px] pt-[18px]">
      <div className="flex min-w-0 flex-col gap-[2px]">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="max-w-[560px] text-[13px] leading-[20px] text-muted-2">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** One settings group: what it is on the left, its fields on the right (stacked when narrow). */
export function Group({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[12px] border-t border-card-border/60 px-[20px] py-[18px] @min-[760px]:grid-cols-[220px_minmax(0,1fr)] @min-[760px]:gap-[32px]">
      <div className="flex flex-col gap-[2px]">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-[12px] leading-[18px] text-muted-2">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-[12px]">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="flex items-baseline justify-between gap-[8px] text-[12px] font-medium text-muted">
        {label}
        {hint && <span className="truncate font-normal text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-field-border"
      }`}
    >
      <span
        className="absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: checked ? "translateX(14px)" : "translateX(0)" }}
      />
    </button>
  );
}

/** A switch with its label, as one row of a list of toggles. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-[40px] items-center justify-between gap-[16px] py-[6px]">
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] text-ink">{label}</span>
        {hint && <span className="text-[12px] text-muted-2">{hint}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

/** "On" / "Off" next to a panel's master switch. */
export function OnOff({ on }: { on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-[6px] text-[12px] font-medium ${on ? "text-ink" : "text-muted-2"}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${on ? "bg-emerald" : "bg-faint"}`} aria-hidden="true" />
      {on ? "On" : "Off"}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "error" | "warning"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : AlertTriangle;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-[8px] rounded-[10px] px-[12px] py-[8px] text-[13px] leading-[20px] ${
        tone === "error" ? "bg-rose-light text-rose-text" : "bg-amber-bg text-amber-text-strong"
      }`}
    >
      <Icon size={14} strokeWidth={2} className="mt-[3px] shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** A short result message that fades in beside the buttons ("Saved", "Test email sent"). */
export function Flash({ show, tone, children }: { show: boolean; tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          role="status"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={`inline-flex items-center gap-[6px] text-[13px] ${tone === "ok" ? "text-emerald-text" : "text-rose-text"}`}
        >
          <span className={`h-[6px] w-[6px] rounded-full ${tone === "ok" ? "bg-emerald" : "bg-rose"}`} aria-hidden="true" />
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** The bar along the bottom of a panel: result messages on the left, actions on the right. */
export function PanelFooter({ status, children }: { status?: React.ReactNode; children: React.ReactNode }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-[12px] rounded-b-[16px] border-t border-card-border/60 bg-surface-2/40 px-[20px] py-[12px]">
      <div className="flex min-h-[20px] min-w-0 flex-wrap items-center gap-x-[16px] gap-y-[4px]">{status}</div>
      <div className="ml-auto flex flex-wrap items-center gap-[8px]">{children}</div>
    </footer>
  );
}
