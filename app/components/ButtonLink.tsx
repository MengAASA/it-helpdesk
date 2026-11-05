import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  quiet: "border border-field-border bg-surface text-ink hover:border-field-border-hover hover:bg-surface-2",
} as const;

/** A link styled as a button. Hover only shifts the colour; no movement. */
export default function ButtonLink({
  href,
  label,
  icon: Icon,
  variant = "primary",
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[32px] items-center gap-[8px] rounded-[8px] px-[12px] text-[13px] font-medium transition-colors duration-200 ${VARIANTS[variant]}`}
    >
      {Icon && <Icon size={14} strokeWidth={2} className="shrink-0" />}
      {label}
    </Link>
  );
}
