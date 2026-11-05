"use client";

import { useState } from "react";
import type { CountRow } from "@/app/lib/reportsData";

const PALETTE = ["var(--primary)", "var(--lime-bright)", "var(--chart-sky)", "var(--chart-pink)", "var(--chart-amber)"];
const GAP = 1.4; // gap between segments, in percent of the ring

/**
 * Thin ring split by team. Hovering a segment or its legend row brings it forward, dims the rest
 * and puts its numbers in the centre. Only opacity and stroke width change, so it stays smooth.
 */
export default function TeamDonut({ rows, total }: { rows: CountRow[]; total: number }) {
  const [active, setActive] = useState<number | null>(null);
  if (rows.length === 0 || total === 0) return <p className="py-[8px] text-[13px] text-muted-2">No tickets yet.</p>;

  const multi = rows.length > 1;
  // Each segment starts where the previous ones end (shares are percentages of the ring).
  const segments = rows.reduce<{ row: CountRow; i: number; start: number; length: number; color: string }[]>((acc, row, i) => {
    const share = (row.count / total) * 100;
    const prev = acc[acc.length - 1];
    const start = prev ? prev.start + (prev.row.count / total) * 100 : 0;
    acc.push({ row, i, start, length: Math.max(share - (multi ? GAP : 0), 0.5), color: PALETTE[i % PALETTE.length] });
    return acc;
  }, []);
  const focus = active === null ? null : rows[active];

  return (
    <div className="flex items-center gap-[20px]" onMouseLeave={() => setActive(null)}>
      <div className="relative h-[124px] w-[124px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Tickets by team">
          <circle cx={60} cy={60} r={48} fill="none" stroke="var(--surface-2)" strokeWidth={12} />
          {segments.map((s) => (
            <circle
              key={s.row.label}
              cx={60}
              cy={60}
              r={48}
              fill="none"
              pathLength={100}
              stroke={s.color}
              strokeWidth={active === s.i ? 15 : 12}
              strokeDasharray={`${s.length} 100`}
              strokeDashoffset={-s.start}
              onMouseEnter={() => setActive(s.i)}
              className={`draw transition-[opacity,stroke-width] duration-200 ${active !== null && active !== s.i ? "opacity-30" : ""}`}
              style={{ animationDelay: `${s.i * 90}ms` }}
            >
              <title>{`${s.row.label}: ${s.row.count}`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[22px] font-semibold leading-none tabular-nums text-ink">{focus ? focus.count : total}</span>
          <span className="mt-[4px] max-w-[84px] truncate text-[11px] text-muted-2">{focus ? focus.label : "tickets"}</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-[8px]">
        {segments.map((s) => (
          <li
            key={s.row.label}
            onMouseEnter={() => setActive(s.i)}
            className={`flex items-center justify-between gap-[10px] text-[13px] transition-opacity duration-200 ${
              active !== null && active !== s.i ? "opacity-40" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-[8px] text-ink">
              <span className="h-[8px] w-[8px] shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {s.row.count}
              <span className="ml-[6px] text-[12px] text-muted-2">{Math.round((s.row.count / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
