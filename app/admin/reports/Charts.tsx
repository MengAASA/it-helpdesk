import type { CountRow, WeekFlow } from "@/app/lib/reportsData";
import { PriorityBadge } from "@/app/components/TicketBadges";

/*
 * Hand-built chart pieces for the reports page: plain SVG and CSS, no chart library. Motion is
 * limited to transform and opacity (grow-in on load, dim-the-rest on hover), which the browser
 * composites without re-layout, so nothing flickers. Colours come from tokens, so the same chart
 * reads correctly on a white card and on a navy `tile-ink` card.
 */

const ACCENT = {
  violet: "bg-primary",
  lime: "bg-lime-bright",
  sky: "bg-chart-sky",
} as const;

export type Accent = keyof typeof ACCENT;

const PRIORITY_ORDER = ["High", "Normal", "Low"];
const PRIORITY_FILL: Record<string, string> = { High: "bg-prio-high", Normal: "bg-prio-normal", Low: "bg-prio-low" };

/** Share of the total as a whole percentage, or 0 when there is nothing to divide by. */
export function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/**
 * Ranked horizontal bars. Bars are scaled to the largest row so differences are easy to see;
 * the label shows each row's share of all tickets. Rows past `limit` are summarised, not dropped.
 */
export function RankList({
  rows,
  total,
  accent = "violet",
  limit = 8,
}: {
  rows: CountRow[];
  total: number;
  accent?: Accent;
  limit?: number;
}) {
  if (rows.length === 0) return <p className="py-[8px] text-[13px] text-muted-2">No tickets yet.</p>;
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit);
  const restCount = rest.reduce((n, r) => n + r.count, 0);
  const max = Math.max(...shown.map((r) => r.count), 1);

  return (
    <ul className="group/rank flex flex-col gap-[12px]">
      {shown.map((row, i) => (
        <li
          key={row.label}
          className="transition-opacity duration-200 group-hover/rank:opacity-40 hover:!opacity-100"
        >
          <div className="flex items-baseline justify-between gap-[12px] text-[13px]">
            <span className="truncate text-ink" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-ink">
              {row.count}
              <span className="ml-[6px] text-[12px] font-normal text-muted-2">{percent(row.count, total)}%</span>
            </span>
          </div>
          <div className="mt-[6px] h-[6px] overflow-hidden rounded-full bg-surface-2">
            <div
              className={`grow-x h-full rounded-full ${ACCENT[accent]}`}
              style={{ width: `${(row.count / max) * 100}%`, minWidth: row.count > 0 ? 4 : 0, animationDelay: `${i * 60}ms` }}
            />
          </div>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="text-[12px] text-muted-2">
          +{rest.length} more · {restCount} {restCount === 1 ? "ticket" : "tickets"}
        </li>
      )}
    </ul>
  );
}

/** Three columns in priority order (not by count), each in its priority colour. */
export function PriorityColumns({ rows, total }: { rows: CountRow[]; total: number }) {
  const counts = PRIORITY_ORDER.map((p) => ({ label: p, count: rows.find((r) => r.label === p)?.count ?? 0 }));
  // Any priority value outside the usual three still gets counted, after them.
  const extra = rows.filter((r) => !PRIORITY_ORDER.includes(r.label));
  const all = [...counts, ...extra];
  const max = Math.max(...all.map((r) => r.count), 1);

  return (
    <div className="group/cols flex items-end gap-[12px]">
      {all.map((row, i) => (
        <div
          key={row.label}
          className="flex flex-1 flex-col items-center gap-[8px] transition-opacity duration-200 group-hover/cols:opacity-40 hover:!opacity-100"
        >
          <span className="text-[18px] font-semibold tabular-nums text-ink">{row.count}</span>
          <div className="flex h-[96px] w-full items-end justify-center rounded-[10px] bg-surface-2/70">
            <div
              className={`grow-y w-full rounded-[10px] ${PRIORITY_FILL[row.label] ?? "bg-slate"}`}
              style={{ height: `${(row.count / max) * 100}%`, minHeight: row.count > 0 ? 6 : 0, animationDelay: `${i * 80}ms` }}
            />
          </div>
          <PriorityBadge priority={row.label} />
          <span className="text-[12px] tabular-nums text-muted-2">{percent(row.count, total)}%</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Created (violet, rising) against closed (lime, hanging) per week. Built from HTML rather than a
 * scaled SVG so the labels stay a readable size at any card width. Hovering a week dims the others
 * and prints its two numbers.
 */
export function WeekColumns({ weeks }: { weeks: WeekFlow[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.resolved]));
  // Bars use at most 78% of each half, leaving room for the hover number above (or below) them.
  const h = (n: number) => `${(n / max) * 78}%`;

  return (
    <div>
      <div className="group/weeks flex h-[156px] gap-[4px]" role="img" aria-label="Tickets created and closed per week">
        {weeks.map((w, i) => (
          <div
            key={w.key}
            title={`Week of ${w.label}: ${w.created} created, ${w.resolved} closed`}
            className="group/wk flex flex-1 flex-col transition-opacity duration-200 group-hover/weeks:opacity-35 hover:!opacity-100"
          >
            <div className="relative flex-1">
              {w.created > 0 && (
                <div
                  className="grow-y absolute inset-x-0 bottom-[2px] mx-auto w-full max-w-[14px] rounded-[4px] bg-primary"
                  style={{ height: h(w.created), animationDelay: `${i * 40}ms` }}
                />
              )}
              <span
                className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-ink opacity-0 transition-opacity duration-150 group-hover/wk:opacity-100"
                style={{ bottom: `calc(${h(w.created)} + 6px)` }}
              >
                {w.created}
              </span>
            </div>
            <div className="h-px shrink-0 bg-card-border" />
            <div className="relative flex-1">
              {w.resolved > 0 && (
                <div
                  className="grow-y absolute inset-x-0 top-[2px] mx-auto w-full max-w-[14px] rounded-[4px] bg-lime-bright"
                  style={{ height: h(w.resolved), transformOrigin: "top", animationDelay: `${i * 40}ms` }}
                />
              )}
              <span
                className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-ink opacity-0 transition-opacity duration-150 group-hover/wk:opacity-100"
                style={{ top: `calc(${h(w.resolved)} + 6px)` }}
              >
                {w.resolved}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[6px] flex justify-between text-[11px] text-muted-2">
        <span>{weeks[0]?.label}</span>
        <span>This week</span>
      </div>
    </div>
  );
}

/** Half-ring gauge for a single percentage. */
export function Gauge({ pct, accent = "lime" }: { pct: number | null; accent?: "lime" | "violet" }) {
  const stroke = accent === "lime" ? "var(--lime-bright)" : "var(--primary)";
  return (
    <svg viewBox="0 0 120 66" className="w-full max-w-[220px]" role="img" aria-label={pct === null ? "No data" : `${pct}%`}>
      <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--surface-2)" strokeWidth={10} strokeLinecap="round" />
      {pct !== null && pct > 0 && (
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          pathLength={100}
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${pct} 100`}
          className="draw"
        />
      )}
    </svg>
  );
}
