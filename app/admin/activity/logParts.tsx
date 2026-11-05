"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import Avatar from "@/app/components/Avatar";
import { Pagination, type ListSort } from "../listParts";

export { COL_SEP } from "../listParts";

/*
 * Shared by the two activity logs (ticket changes, settings changes): the filter state, the
 * toolbar, the day-grouped list and its footer. Each log only decides its columns and how a
 * row reads. Columns appear as the list gets wider (container queries), so there is never a
 * horizontal scrollbar.
 */

const PAGE_SIZE = 50;

/** Timestamp parts, formatted on the server so every row reads the same way. */
export type LogStamp = {
  id: number;
  createdAt: string;
  /** Local calendar day, e.g. "2026-11-05", used to group rows. */
  dayKey: string;
  /** "Today", "Yesterday", "Tuesday, 3 Nov" or "3 Nov 2025". */
  dayLabel: string;
  /** "3 Nov 2026" */
  date: string;
  /** "14:32" */
  time: string;
};

/**
 * One list row. Cells stretch to the row height (so the column dividers run unbroken from row to
 * row) and their content sits on the first line, so a summary can wrap without a jagged row.
 */
export const LOG_ROW =
  "flex min-h-[40px] items-stretch gap-[12px] rounded-[10px] px-[10px] text-[13px] leading-[20px] transition-colors duration-150 *:py-[10px] hover:bg-surface-2/50";

/** The header strip above the rows; its slots mirror LOG_ROW. */
export const LOG_HEADER =
  "flex h-[40px] items-stretch gap-[12px] border-b border-card-border px-[10px] text-[12px] font-medium text-muted-2";

export function useLogList<T extends LogStamp, K extends string>(
  rows: T[],
  {
    searchFields,
    facets,
    sortValue,
  }: {
    searchFields: (keyof T)[];
    /** Fields offered as filter dropdowns, in toolbar order. */
    facets: (keyof T)[];
    sortValue: (row: T, key: K) => string;
  }
) {
  const [search, setSearchRaw] = useState("");
  const [facetValues, setFacetValues] = useState<string[]>(() => facets.map(() => "All"));
  const [dateFrom, setDateFromRaw] = useState("");
  const [dateTo, setDateToRaw] = useState("");
  const [sort, setSort] = useState<ListSort<K | "createdAt">>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const facetOptions = useMemo(
    () => facets.map((f) => Array.from(new Set(rows.map((r) => String(r[f] ?? "")))).sort((a, b) => a.localeCompare(b))),
    // facets is a literal from the caller and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return rows.filter((r) => {
      for (let i = 0; i < facets.length; i++) {
        if (facetValues[i] !== "All" && String(r[facets[i]] ?? "") !== facetValues[i]) return false;
      }
      const t = new Date(r.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      if (!q) return true;
      return searchFields.some((field) => String(r[field] ?? "").toLowerCase().includes(q));
    });
    // facets and searchFields are literals from the caller and never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, facetValues, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const diff =
        sort.key === "createdAt"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : sortValue(a, sort.key as K).localeCompare(sortValue(b, sort.key as K));
      return sort.direction === "asc" ? diff : -diff;
    });
    return out;
    // sortValue is a stable module-level function in each log.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort]);

  // How many rows each day has across all pages, for the day headings.
  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of sorted) m.set(r.dayKey, (m.get(r.dayKey) ?? 0) + 1);
    return m;
  }, [sorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = search.trim() !== "" || dateFrom !== "" || dateTo !== "" || facetValues.some((v) => v !== "All");

  return {
    search,
    setSearch: (v: string) => {
      setSearchRaw(v);
      setPage(1);
    },
    facetValues,
    facetOptions,
    setFacet: (i: number, v: string) => {
      setFacetValues((prev) => prev.map((old, j) => (j === i ? v : old)));
      setPage(1);
    },
    dateFrom,
    dateTo,
    setDateFrom: (v: string) => {
      setDateFromRaw(v);
      setPage(1);
    },
    setDateTo: (v: string) => {
      setDateToRaw(v);
      setPage(1);
    },
    hasFilters,
    clear: () => {
      setSearchRaw("");
      setFacetValues(facets.map(() => "All"));
      setDateFromRaw("");
      setDateToRaw("");
      setPage(1);
    },
    sort,
    toggleSort: (key: K | "createdAt") => {
      setSort((prev) =>
        prev.key === key
          ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
          : { key, direction: key === "createdAt" ? "desc" : "asc" }
      );
      setPage(1);
    },
    /** Day headings only make sense while the list runs in time order. */
    grouped: sort.key === "createdAt",
    dayCounts,
    total: sorted.length,
    pageRows,
    page: currentPage,
    totalPages,
    setPage,
    rangeStart: sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
    rangeEnd: Math.min(currentPage * PAGE_SIZE, sorted.length),
  };
}

export function LogToolbar({
  search,
  onSearch,
  placeholder,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  hasFilters,
  onClear,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  hasFilters: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const field =
    "h-[30px] rounded-[8px] border border-field-border bg-surface text-[13px] text-ink outline-none transition-colors hover:border-field-border-hover";
  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <div className="relative w-full sm:w-[260px]">
        <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label="Search activity"
          className={`${field} w-full pl-[30px] pr-[10px] placeholder:text-faint`}
        />
      </div>
      {children}
      <div className="flex items-center gap-[6px]">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFrom(e.target.value)}
          max={dateTo || undefined}
          aria-label="From date"
          className={`${field} px-[8px] tabular-nums ${dateFrom ? "" : "text-muted-2"}`}
        />
        <span className="text-[12px] text-faint">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateTo(e.target.value)}
          min={dateFrom || undefined}
          aria-label="To date"
          className={`${field} px-[8px] tabular-nums ${dateTo ? "" : "text-muted-2"}`}
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-[30px] items-center gap-[4px] rounded-[8px] px-[8px] text-[13px] text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X size={14} strokeWidth={1.75} />
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * The list card. While the log runs in time order, rows sit under a heading per day, so a time
 * column only needs the clock time; sorted any other way, it is one flat list.
 */
export function LogList<T extends LogStamp>({
  label,
  header,
  rows,
  grouped,
  dayCounts,
  noun,
  hasFilters,
  onClear,
  renderRow,
}: {
  label: string;
  header: React.ReactNode;
  rows: T[];
  grouped: boolean;
  dayCounts: Map<string, number>;
  noun: string;
  hasFilters: boolean;
  onClear: () => void;
  renderRow: (row: T) => React.ReactNode;
}) {
  const groups: { key: string; label: string | null; rows: T[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (grouped && last?.key === r.dayKey) last.rows.push(r);
    else if (!grouped && last) last.rows.push(r);
    else groups.push({ key: grouped ? r.dayKey : "all", label: grouped ? r.dayLabel : null, rows: [r] });
  }

  return (
    <section aria-label={label} className="@container rounded-[16px] border border-card-border/50 bg-surface px-[6px] pb-[6px]">
      <div className={LOG_HEADER}>{header}</div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-[4px] px-[16px] py-[48px] text-center">
          <p className="text-[13px] font-medium text-ink">{hasFilters ? "Nothing matches" : `No ${noun} yet`}</p>
          <p className="text-[12px] text-muted-2">
            {hasFilters ? "Try another search, or loosen a filter." : "Changes will show up here as they happen."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="mt-[10px] h-[28px] rounded-[7px] border border-field-border px-[10px] text-[12px] text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="pt-[4px]">
            {g.label && (
              <h3 className="flex items-baseline justify-between gap-[12px] px-[10px] pb-[4px] pt-[12px] text-[12px] font-medium text-ink">
                {g.label}
                <span className="font-normal tabular-nums text-faint">
                  {dayCounts.get(g.key) ?? g.rows.length} {(dayCounts.get(g.key) ?? g.rows.length) === 1 ? "change" : "changes"}
                </span>
              </h3>
            )}
            <ul className="flex flex-col">{g.rows.map(renderRow)}</ul>
          </div>
        ))
      )}
    </section>
  );
}

export function LogFooter({
  rangeStart,
  rangeEnd,
  total,
  noun,
  page,
  totalPages,
  onPage,
}: {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  noun: string;
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-[8px]">
      <span className="text-[12px] tabular-nums text-muted-2">
        {total === 0 ? `No ${noun}` : `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString()} ${noun}`}
      </span>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  );
}

/** Clock time under a day heading; the full date once the list is not in time order. */
export function TimeCell({ row, grouped, className }: { row: LogStamp; grouped: boolean; className: string }) {
  return (
    <span className={`${className} items-baseline gap-[6px] whitespace-nowrap tabular-nums`}>
      {grouped ? (
        <span className="text-muted">{row.time}</span>
      ) : (
        <>
          <span className="text-ink">{row.date}</span>
          <span className="text-[12px] text-muted-2">{row.time}</span>
        </>
      )}
    </span>
  );
}

export function ActorCell({ name, className }: { name: string; className: string }) {
  return (
    <span className={`${className} min-w-0 items-start gap-[8px]`}>
      <Avatar name={name} size={20} />
      <span className="truncate text-ink" title={name}>
        {name}
      </span>
    </span>
  );
}

/** A quiet kind marker: a coloured dot and a word, no filled chip. */
export function KindTag({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[8px] whitespace-nowrap text-muted">
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
