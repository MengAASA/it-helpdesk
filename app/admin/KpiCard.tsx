import type { LucideIcon } from "lucide-react";

const TONE_STYLES = {
  primary: { bg: "bg-result-bg", border: "border-result-border", icon: "bg-primary text-paper", text: "text-primary" },
  blue: { bg: "bg-[color:var(--color-blue-light)]", border: "border-[color:var(--color-blue)]/25", icon: "bg-[color:var(--color-blue)] text-paper", text: "text-[color:var(--color-blue-text)]" },
  rose: { bg: "bg-[color:var(--color-rose-light)]", border: "border-[color:var(--color-rose)]/25", icon: "bg-[color:var(--color-rose)] text-paper", text: "text-[color:var(--color-rose-text)]" },
  violet: { bg: "bg-[color:var(--color-violet-light)]", border: "border-[color:var(--color-violet)]/25", icon: "bg-[color:var(--color-violet)] text-paper", text: "text-[color:var(--color-violet-text)]" },
  emerald: { bg: "bg-[color:var(--color-emerald-light)]", border: "border-[color:var(--color-emerald)]/25", icon: "bg-[color:var(--color-emerald)] text-paper", text: "text-[color:var(--color-emerald-text)]" },
  amber: { bg: "bg-amber-bg", border: "border-amber-border", icon: "bg-[color:var(--color-amber-solid)] text-paper", text: "text-amber-text-strong" },
} as const;

export type KpiTone = keyof typeof TONE_STYLES;

export default function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: KpiTone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div
      className={`flex flex-1 min-w-[150px] items-center gap-[12px] rounded-[12px] border ${s.border} ${s.bg} px-[16.5px] py-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-transform hover:-translate-y-[1.5px] hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]`}
    >
      <span className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] ${s.icon}`}>
        <Icon size={17} strokeWidth={2.25} />
      </span>
      <div className="flex flex-col gap-[1.5px]">
        <span className={`font-heading text-[21px] font-semibold leading-none ${s.text}`}>{value}</span>
        <span className="text-[9.75px] font-medium text-muted-2">{label}</span>
      </div>
    </div>
  );
}
