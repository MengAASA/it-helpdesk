import type { LucideIcon } from "lucide-react";

const TONE_ICON = {
  primary: "text-primary",
  blue: "text-blue",
  indigo: "text-indigo",
  rose: "text-rose",
  violet: "text-violet",
  emerald: "text-emerald",
  amber: "text-amber-solid",
  teal: "text-teal",
  slate: "text-slate",
} as const;

export type KpiTone = keyof typeof TONE_ICON;

/** Compact statistic: neutral card, colour only on the icon, so a row of them stays calm. */
export default function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: KpiTone;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[6px] rounded-[8px] border border-card-border bg-surface px-[14px] py-[12px] shadow-card transition-colors group-hover:border-faint/60">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="truncate text-[12px] font-medium text-muted-2">{label}</span>
        <Icon size={15} strokeWidth={1.75} className={`shrink-0 ${TONE_ICON[tone]}`} />
      </div>
      <span className="text-[22px] font-semibold leading-none tracking-[-0.01em] text-ink tabular-nums">{value}</span>
      {hint && <span className="truncate text-[11px] text-faint">{hint}</span>}
    </div>
  );
}
