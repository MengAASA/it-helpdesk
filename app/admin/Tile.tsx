import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FlipCard } from "./SidebarFlip";

/**
 * Card tones for the masonry pages (dashboard, reports).
 * - plain: white card with a border that is only just visible.
 * - ink: deep navy. `tile-ink` (globals.css) re-points the colour tokens inside it, so text, axes
 *   and charts adapt to the dark background without per-component dark variants.
 * - soft: a violet tint for the odd highlight.
 */
const TILE_TONES = {
  plain: "border-card-border/40 bg-surface hover:border-card-border",
  ink: "tile-ink border-transparent",
  soft: "border-transparent bg-primary-soft",
} as const;

export type TileTone = keyof typeof TILE_TONES;

export function Tile({
  title,
  meta,
  href,
  tone = "plain",
  children,
}: {
  title: string;
  meta?: string;
  href?: string;
  tone?: TileTone;
  children: React.ReactNode;
}) {
  return (
    <FlipCard
      radius={16}
      className={`group/tile mb-[16px] break-inside-avoid rounded-[16px] border p-[16px] transition-colors duration-200 ${TILE_TONES[tone]}`}
    >
      <header className="mb-[14px] flex items-start justify-between gap-[12px]">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {meta && <p className="text-[12px] tabular-nums text-muted-2">{meta}</p>}
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`Open ${title.toLowerCase()}`}
            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] transition-colors duration-200 ${
              tone === "ink" ? "bg-white/10 text-white hover:bg-white/20" : "bg-surface-2 text-muted hover:bg-primary hover:text-white"
            }`}
          >
            <ArrowUpRight
              size={14}
              strokeWidth={2}
              className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/tile:-translate-y-[1px] group-hover/tile:translate-x-[1px] motion-reduce:transition-none"
            />
          </Link>
        )}
      </header>
      {children}
    </FlipCard>
  );
}

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="py-[12px] text-[13px] text-muted-2">{children}</p>;
}
