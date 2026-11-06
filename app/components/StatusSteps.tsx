/**
 * Received → In progress → Closed, with the time each step was reached. Used inside the dark status
 * card on both ticket pages (public and admin). No hooks, so it renders on the server or the client.
 */

export type StatusStepEvent = { from: string | null; to: string | null; at: Date };

const STEPS = [
  { status: "Open", label: "Received" },
  { status: "In Progress", label: "In progress" },
  { status: "Closed", label: "Closed" },
];

const STATUS_RANK: Record<string, number> = { Open: 1, "In Progress": 2, Closed: 3 };

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** "Aug 28, 6:03 PM", for the narrow columns. */
function formatShort(d: Date): string {
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export default function StatusSteps({
  status,
  createdAt,
  events,
}: {
  status: string;
  createdAt: Date;
  /** Status changes only, oldest first. */
  events: StatusStepEvent[];
}) {
  const reached = STATUS_RANK[status] ?? 1;
  // After a reopen the track starts over: only steps reached since then get a time, so a ticket
  // that was reopened and closed straight away shows "Skipped" for In progress, not an old date.
  const reopenedAt = [...events].reverse().find((e) => e.to === "Open" && e.from === "Closed")?.at;
  const since = events.filter((e) => !reopenedAt || e.at >= reopenedAt);
  const lastTo = (s: string) => [...since].reverse().find((e) => e.to === s)?.at;
  const times = [reopenedAt ?? createdAt, lastTo("In Progress"), lastTo("Closed")];
  const labels = STEPS.map((s, i) => (i === 0 && reopenedAt ? "Reopened" : s.label));

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="grid grid-cols-3 gap-[4px]" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.status} className="h-[4px] overflow-hidden rounded-full bg-surface-2">
            {i < reached && (
              // Keyed by status so the bars grow again when an admin changes it.
              <span
                key={status}
                className={`grow-x block h-full rounded-full ${reached === 3 ? "bg-lime-bright" : "bg-primary"}`}
                style={{ animationDelay: `${150 + i * 160}ms` }}
              />
            )}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-3 gap-[4px]">
        {STEPS.map((s, i) => {
          const at = i < reached ? times[i] : undefined;
          return (
            <li key={s.status} className="flex min-w-0 flex-col">
              <span className={`text-[12px] font-medium ${i < reached ? "text-ink" : "text-faint"}`}>{labels[i]}</span>
              <span className="truncate text-[11px] tabular-nums text-muted-2">
                {at ? (
                  <time dateTime={at.toISOString()} title={formatTimestamp(at)}>
                    {formatShort(at)}
                  </time>
                ) : i < reached ? (
                  "Skipped"
                ) : (
                  "Not yet"
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
