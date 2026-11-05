"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import FilterDropdown from "@/app/components/FilterDropdown";
import Avatar from "@/app/components/Avatar";
import { StatusDot, PriorityDot } from "@/app/components/TicketBadges";
import { SortHeader } from "../listParts";
import { ActorCell, KindTag, LogFooter, LogList, LogToolbar, TimeCell, useLogList, COL_SEP, LOG_ROW, type LogStamp } from "./logParts";

export type ActivityRow = LogStamp & {
  eventType: string;
  fromValue: string | null;
  toValue: string | null;
  actorName: string;
  ticketNumber: string;
  subject: string;
  /** Plain-sentence version of the change; searched, and the fallback for unknown event types. */
  description: string;
};

type SortKey = "eventType" | "actorName" | "ticketNumber" | "description";

const KIND: Record<string, { label: string; dot: string }> = {
  status: { label: "Status", dot: "bg-primary" },
  assignment: { label: "Assignment", dot: "bg-chart-sky" },
  priority: { label: "Priority", dot: "bg-chart-amber" },
  feedback: { label: "Feedback", dot: "bg-lime" },
  sla_breach: { label: "SLA breach", dot: "bg-rose" },
};

function kindLabel(type: string): string {
  return KIND[type]?.label ?? type.replace(/_/g, " ");
}

/**
 * Column slots shared by the header and every row. Secondary columns appear only once the list
 * is wide enough; below that their content folds into the change cell.
 */
const COL = {
  kind: `hidden w-[124px] shrink-0 @min-[880px]:flex ${COL_SEP}`,
  change: `flex min-w-0 flex-1 ${COL_SEP}`,
  ticket: `hidden w-[232px] shrink-0 @min-[760px]:flex @min-[1000px]:w-[272px] @min-[1120px]:w-[352px] ${COL_SEP}`,
  actor: `hidden w-[180px] shrink-0 @min-[560px]:flex ${COL_SEP}`,
} as const;

const SEARCH_FIELDS: (keyof ActivityRow)[] = ["actorName", "ticketNumber", "subject", "description", "eventType"];

function sortValue(row: ActivityRow, key: SortKey): string {
  return row[key];
}

export default function ActivityTable({ events }: { events: ActivityRow[] }) {
  const log = useLogList<ActivityRow, SortKey>(events, {
    searchFields: SEARCH_FIELDS,
    facets: ["eventType", "actorName"],
    sortValue,
  });
  const timeCol = log.grouped ? "flex w-[48px] shrink-0" : "flex w-[132px] shrink-0";

  return (
    <div className="flex flex-col gap-[12px]">
      <LogToolbar
        search={log.search}
        onSearch={log.setSearch}
        placeholder="Search ID, subject, person…"
        dateFrom={log.dateFrom}
        dateTo={log.dateTo}
        onDateFrom={log.setDateFrom}
        onDateTo={log.setDateTo}
        hasFilters={log.hasFilters}
        onClear={log.clear}
      >
        <FilterDropdown
          label="Type"
          value={log.facetValues[0]}
          onChange={(v) => log.setFacet(0, v)}
          options={log.facetOptions[0]}
          optionLabel={kindLabel}
        />
        <FilterDropdown label="Changed by" value={log.facetValues[1]} onChange={(v) => log.setFacet(1, v)} options={log.facetOptions[1]} />
      </LogToolbar>

      <LogList
        label="Ticket activity"
        noun="ticket changes"
        rows={log.pageRows}
        grouped={log.grouped}
        dayCounts={log.dayCounts}
        hasFilters={log.hasFilters}
        onClear={log.clear}
        header={
          <>
            <SortHeader label="Time" sortKey="createdAt" sort={log.sort} onSort={log.toggleSort} className={timeCol} />
            <SortHeader label="Type" sortKey="eventType" sort={log.sort} onSort={log.toggleSort} className={COL.kind} />
            <SortHeader label="Change" sortKey="description" sort={log.sort} onSort={log.toggleSort} className={COL.change} />
            <SortHeader label="Ticket" sortKey="ticketNumber" sort={log.sort} onSort={log.toggleSort} className={COL.ticket} />
            <SortHeader label="Changed by" sortKey="actorName" sort={log.sort} onSort={log.toggleSort} className={COL.actor} />
          </>
        }
        renderRow={(e) => (
          <li key={e.id} className={LOG_ROW}>
            <TimeCell row={e} grouped={log.grouped} className={timeCol} />
            <span className={COL.kind}>
              <KindTag dot={KIND[e.eventType]?.dot ?? "bg-faint"} label={kindLabel(e.eventType)} />
            </span>
            <div className={`${COL.change} flex-col`}>
              <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[2px]">
                {/* Without its own column, the type leads the change. */}
                <span className="text-muted-2 @min-[880px]:hidden">{kindLabel(e.eventType)}</span>
                <Change row={e} />
              </div>
              {/* Ticket and person fold under the change on narrow lists. */}
              <div className="flex min-w-0 items-center gap-[6px] text-[12px] text-muted-2 @min-[760px]:hidden">
                <Link href={`/admin/tickets/${e.ticketNumber}`} className="shrink-0 font-mono-plex text-ink hover:text-primary">
                  {e.ticketNumber}
                </Link>
                <span className="hidden truncate @min-[480px]:inline">{e.subject}</span>
                <span className="shrink-0 @min-[560px]:hidden">· {e.actorName}</span>
              </div>
            </div>
            <Link
              href={`/admin/tickets/${e.ticketNumber}`}
              title={`${e.ticketNumber} · ${e.subject}`}
              className={`${COL.ticket} group/tk min-w-0 items-baseline gap-[8px] rounded-[4px]`}
            >
              <span className="shrink-0 font-mono-plex text-[12px] text-muted-2 transition-colors group-hover/tk:text-primary">
                {e.ticketNumber}
              </span>
              <span className="truncate text-ink transition-colors group-hover/tk:text-primary">{e.subject}</span>
            </Link>
            <ActorCell name={e.actorName} className={COL.actor} />
          </li>
        )}
      />

      <LogFooter
        rangeStart={log.rangeStart}
        rangeEnd={log.rangeEnd}
        total={log.total}
        noun={log.total === 1 ? "ticket change" : "ticket changes"}
        page={log.page}
        totalPages={log.totalPages}
        onPage={log.setPage}
      />
    </div>
  );
}

/** The change itself, drawn as before → after where there is a before and an after. */
function Change({ row }: { row: ActivityRow }) {
  const { eventType, fromValue, toValue } = row;

  if (eventType === "status" || eventType === "priority") {
    const side = (v: string | null, strong: boolean) =>
      v ? (
        <span className={`inline-flex items-center gap-[6px] whitespace-nowrap ${strong ? "font-medium text-ink" : "text-muted"}`}>
          {eventType === "status" ? <StatusDot status={v} /> : <PriorityDot priority={v} />}
          {v}
        </span>
      ) : (
        <span className="text-faint">—</span>
      );
    return (
      <FromTo>
        {side(fromValue, false)}
        {side(toValue, true)}
      </FromTo>
    );
  }

  if (eventType === "assignment") {
    const side = (v: string | null, strong: boolean) =>
      v ? (
        <span className={`inline-flex min-w-0 items-center gap-[6px] ${strong ? "font-medium text-ink" : "text-muted"}`}>
          <Avatar name={v} size={16} />
          <span className="truncate">{v}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-[6px] text-faint">
          <span className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-dashed border-faint/60">
            <UserRound size={9} strokeWidth={2} />
          </span>
          Unassigned
        </span>
      );
    return (
      <FromTo>
        {side(fromValue, false)}
        {side(toValue, true)}
      </FromTo>
    );
  }

  if (eventType === "feedback") {
    const up = toValue === "up";
    return (
      <span className="text-ink">
        Marked{" "}
        <span className={`font-medium ${up ? "text-emerald-text" : "text-rose-text"}`}>{up ? "resolved" : "not resolved"}</span>
      </span>
    );
  }

  if (eventType === "sla_breach") {
    return toValue === "notified" ? (
      <span className="text-ink">Breach notification sent</span>
    ) : (
      <span className="text-ink">
        Breach detected <span className="text-muted-2">· no one to notify</span>
      </span>
    );
  }

  return <span className="text-ink first-letter:uppercase">{row.description}</span>;
}

function FromTo({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[2px]">
      {children[0]}
      <ArrowRight size={13} strokeWidth={1.75} className="shrink-0 text-faint" aria-label="to" />
      {children[1]}
    </span>
  );
}
