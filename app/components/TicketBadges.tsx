/** Status colours: Open blue, In Progress indigo, Closed neutral, Overdue red. Used everywhere a ticket's state shows. */
const STATUS_DOT: Record<string, string> = {
  Open: "bg-blue",
  "In Progress": "bg-indigo",
  Closed: "bg-slate",
};

/** Priority colours: High red, Normal blue, Low green. Shown as text colour, with fills only in charts and swatches. */
const PRIORITY_FILL: Record<string, string> = {
  High: "bg-prio-high",
  Normal: "bg-prio-normal",
  Low: "bg-prio-low",
};

const PRIORITY_PILL: Record<string, string> = {
  High: "bg-prio-high-bg text-prio-high",
  Normal: "bg-prio-normal-bg text-prio-normal",
  Low: "bg-prio-low-bg text-prio-low",
};

/**
 * Solid 12px glyphs in the pill's colour; the inner mark is cut out in the surface colour, so it
 * reads white in light mode and dark in dark mode. High warns, Normal is level, Low points down.
 */
function PriorityGlyph({ priority }: { priority: string }) {
  if (priority === "High") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
        <path d="M5.13 1.5a1 1 0 0 1 1.74 0l4.5 7.8A1 1 0 0 1 10.5 10.8h-9a1 1 0 0 1-.87-1.5Z" fill="currentColor" />
        <rect x="5.35" y="4" width="1.3" height="3.4" rx="0.65" className="fill-surface" />
        <circle cx="6" cy="8.85" r="0.75" className="fill-surface" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      <circle cx="6" cy="6" r="5.5" fill="currentColor" />
      {priority === "Low" ? (
        <path d="M6 3.4v4.6M3.9 6.1 6 8.2l2.1-2.1" fill="none" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" className="stroke-surface" />
      ) : (
        <rect x="3.4" y="5.35" width="5.2" height="1.3" rx="0.65" className="fill-surface" />
      )}
    </svg>
  );
}

export function StatusDot({ status }: { status: string }) {
  return <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT.Open}`} aria-hidden="true" />;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center gap-[6px] rounded-[5px] border border-card-border bg-surface px-[7px] text-[12px] font-medium text-ink">
      <StatusDot status={status} />
      {status}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex h-[20px] shrink-0 items-center rounded-[5px] bg-rose-light px-[7px] text-[11px] font-medium text-rose-text">
      Overdue
    </span>
  );
}

export function AtRiskBadge() {
  return (
    <span className="inline-flex h-[20px] shrink-0 items-center rounded-[5px] bg-amber-bg px-[7px] text-[11px] font-medium text-amber-text">
      At risk
    </span>
  );
}

/** Priority pill: soft tint, deep text and a solid glyph in the same hue. */
export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center gap-[5px] rounded-full pl-[6px] pr-[9px] text-[12px] font-medium ${
        PRIORITY_PILL[priority] ?? PRIORITY_PILL.Normal
      }`}
    >
      <PriorityGlyph priority={priority} />
      {priority}
    </span>
  );
}

/** Small swatch in the priority colour, for menus. */
export function PriorityDot({ priority }: { priority: string }) {
  return <span className={`h-[8px] w-[8px] shrink-0 rounded-[2px] ${PRIORITY_FILL[priority] ?? PRIORITY_FILL.Normal}`} aria-hidden="true" />;
}
