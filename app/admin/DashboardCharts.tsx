export type TrendDay = { key: string; label: string; created: number; resolved: number };

/**
 * Created rises above the axis, resolved hangs below it, one column per day. Hovering a day lifts
 * it, dims the rest and prints its numbers, so the chart can be read without a legend or tooltip.
 */
export function MirrorBars({
  days,
  lastLabel = "Today",
  label = "Tickets created and resolved per day",
  unit = "resolved",
}: {
  days: TrendDay[];
  /** Axis label under the final column. */
  lastLabel?: string;
  label?: string;
  /** Word for the downward series in the hover title ("resolved", "closed"). */
  unit?: string;
}) {
  const W = 560;
  const H = 168;
  const mid = H / 2;
  const half = mid - 18;
  const max = Math.max(1, ...days.flatMap((d) => [d.created, d.resolved]));
  const col = W / days.length;
  const barW = Math.min(18, col * 0.56);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="group/chart h-auto w-full overflow-visible" role="img" aria-label={label}>
      <line x1={0} x2={W} y1={mid} y2={mid} stroke="var(--color-card-border)" strokeWidth={1} />
      {days.map((d, i) => {
        const cx = i * col + col / 2;
        const up = (d.created / max) * half;
        const down = (d.resolved / max) * half;
        const last = i === days.length - 1;
        return (
          <g
            key={d.key}
            className="group/day transition-opacity duration-200 group-hover/chart:opacity-35 hover:!opacity-100"
          >
            <title>{`${d.label}: ${d.created} created, ${d.resolved} ${unit}`}</title>
            <rect x={i * col} y={0} width={col} height={H} fill="transparent" />
            <rect
              x={cx - barW / 2}
              y={mid - Math.max(up, 1.5) - 1}
              width={barW}
              height={Math.max(up, 1.5)}
              rx={Math.min(5, barW / 2)}
              className="fill-primary transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [transform-box:fill-box] [transform-origin:bottom] group-hover/day:scale-y-[1.06]"
            />
            <rect
              x={cx - barW / 2}
              y={mid + 1}
              width={barW}
              height={Math.max(down, 1.5)}
              rx={Math.min(5, barW / 2)}
              className="fill-lime-bright transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [transform-box:fill-box] [transform-origin:top] group-hover/day:scale-y-[1.06]"
            />
            <text
              x={cx}
              y={mid - up - 7}
              textAnchor="middle"
              className="fill-ink text-[11px] font-semibold tabular-nums opacity-0 transition-opacity duration-150 group-hover/day:opacity-100"
            >
              {d.created}
            </text>
            <text
              x={cx}
              y={mid + down + 14}
              textAnchor="middle"
              className="fill-ink text-[11px] font-semibold tabular-nums opacity-0 transition-opacity duration-150 group-hover/day:opacity-100"
            >
              {d.resolved}
            </text>
            {(i === 0 || last) && (
              <text x={cx} y={H - 1} textAnchor={last ? "end" : "start"} dx={last ? barW / 2 : -barW / 2} className="fill-faint text-[10px]">
                {last ? lastLabel : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export type Segment = { label: string; value: number; className: string };

/** A single segmented bar; hovering one segment dims the others so its share stands out. */
export function SegmentBar({ segments, height = 10 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div
      className="group/seg flex w-full gap-[3px]"
      style={{ height }}
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}
    >
      {total === 0 ? (
        <span className="h-full w-full rounded-full bg-surface-2" />
      ) : (
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              className={`h-full rounded-full transition-opacity duration-200 group-hover/seg:opacity-30 hover:!opacity-100 ${s.className}`}
              style={{ flexGrow: s.value, flexBasis: 0 }}
            />
          ))
      )}
    </div>
  );
}
