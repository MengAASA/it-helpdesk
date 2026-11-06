"use client";

import FilterDropdown from "@/app/components/FilterDropdown";
import { SortHeader } from "../listParts";
import { ActorCell, KindTag, LogFooter, LogList, LogToolbar, TimeCell, useLogList, COL_SEP, LOG_ROW, type LogStamp } from "./logParts";

export type SettingsAuditRow = LogStamp & {
  category: "permissions" | "email_settings" | "sla_settings" | "system_links" | "deleted_tickets" | "form_options";
  target: string | null;
  summary: string;
  actorName: string;
};

type SortKey = "category" | "actorName" | "summary";

const CATEGORY: Record<string, { label: string; dot: string }> = {
  permissions: { label: "Permissions", dot: "bg-primary" },
  email_settings: { label: "Email settings", dot: "bg-chart-sky" },
  sla_settings: { label: "SLA settings", dot: "bg-chart-amber" },
  system_links: { label: "System links", dot: "bg-lime-bright" },
  deleted_tickets: { label: "Deleted tickets", dot: "bg-rose-text" },
  form_options: { label: "Form options", dot: "bg-chart-pink" },
};

function categoryLabel(c: string): string {
  return CATEGORY[c]?.label ?? c.replace(/_/g, " ");
}

const COL = {
  category: `hidden w-[144px] shrink-0 @min-[720px]:flex ${COL_SEP}`,
  change: `flex min-w-0 flex-1 ${COL_SEP}`,
  actor: `hidden w-[180px] shrink-0 @min-[560px]:flex ${COL_SEP}`,
} as const;

const SEARCH_FIELDS: (keyof SettingsAuditRow)[] = ["actorName", "summary", "target"];

function sortValue(row: SettingsAuditRow, key: SortKey): string {
  return row[key];
}

export default function SettingsAuditTable({ entries }: { entries: SettingsAuditRow[] }) {
  const log = useLogList<SettingsAuditRow, SortKey>(entries, {
    searchFields: SEARCH_FIELDS,
    facets: ["category", "actorName"],
    sortValue,
  });
  const timeCol = log.grouped ? "flex w-[48px] shrink-0" : "flex w-[132px] shrink-0";

  return (
    <div className="flex flex-col gap-[12px]">
      <LogToolbar
        search={log.search}
        onSearch={log.setSearch}
        placeholder="Search person or change…"
        dateFrom={log.dateFrom}
        dateTo={log.dateTo}
        onDateFrom={log.setDateFrom}
        onDateTo={log.setDateTo}
        hasFilters={log.hasFilters}
        onClear={log.clear}
      >
        <FilterDropdown
          label="Category"
          value={log.facetValues[0]}
          onChange={(v) => log.setFacet(0, v)}
          options={log.facetOptions[0]}
          optionLabel={categoryLabel}
        />
        <FilterDropdown label="Changed by" value={log.facetValues[1]} onChange={(v) => log.setFacet(1, v)} options={log.facetOptions[1]} />
      </LogToolbar>

      <LogList
        label="Settings activity"
        noun="settings changes"
        rows={log.pageRows}
        grouped={log.grouped}
        dayCounts={log.dayCounts}
        hasFilters={log.hasFilters}
        onClear={log.clear}
        header={
          <>
            <SortHeader label="Time" sortKey="createdAt" sort={log.sort} onSort={log.toggleSort} className={timeCol} />
            <SortHeader label="Category" sortKey="category" sort={log.sort} onSort={log.toggleSort} className={COL.category} />
            <SortHeader label="Change" sortKey="summary" sort={log.sort} onSort={log.toggleSort} className={COL.change} />
            <SortHeader label="Changed by" sortKey="actorName" sort={log.sort} onSort={log.toggleSort} className={COL.actor} />
          </>
        }
        renderRow={(e) => (
          <li key={e.id} className={LOG_ROW}>
            <TimeCell row={e} grouped={log.grouped} className={timeCol} />
            <span className={COL.category}>
              <KindTag dot={CATEGORY[e.category]?.dot ?? "bg-faint"} label={categoryLabel(e.category)} />
            </span>
            <div className={`${COL.change} flex-col`}>
              <Summary row={e} />
              <div className="text-[12px] text-muted-2 @min-[720px]:hidden">
                {categoryLabel(e.category)}
                <span className="@min-[560px]:hidden"> · {e.actorName}</span>
              </div>
            </div>
            <ActorCell name={e.actorName} className={COL.actor} />
          </li>
        )}
      />

      <LogFooter
        rangeStart={log.rangeStart}
        rangeEnd={log.rangeEnd}
        total={log.total}
        noun={log.total === 1 ? "settings change" : "settings changes"}
        page={log.page}
        totalPages={log.totalPages}
        onPage={log.setPage}
      />
    </div>
  );
}

/**
 * Permission entries are logged as "<person>: <change>, <change>"; the person leads in full
 * weight so the row reads "who was changed, then what". The summary wraps rather than truncates,
 * so nothing in the audit trail is hidden.
 */
function Summary({ row }: { row: SettingsAuditRow }) {
  const split = row.category === "permissions" ? row.summary.indexOf(": ") : -1;
  if (split > 0) {
    return (
      <p className="text-muted">
        <span className="font-medium text-ink">{row.summary.slice(0, split)}</span>
        <span className="text-faint"> · </span>
        {row.summary.slice(split + 2)}
      </p>
    );
  }
  return <p className="text-ink">{row.summary}</p>;
}
