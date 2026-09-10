"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUp, ArrowDown, ChevronsUpDown, ShieldCheck, SlidersHorizontal } from "lucide-react";
import FilterDropdown from "@/app/components/FilterDropdown";

export type SettingsAuditRow = {
  id: number;
  createdAt: string;
  createdAtLabel: string;
  category: "permissions" | "email_settings" | "sla_settings";
  target: string | null;
  summary: string;
  actorName: string;
};

type SortKey = "createdAt" | "category" | "actorName" | "summary";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "createdAt", label: "Timestamp" },
  { key: "category", label: "Category" },
  { key: "actorName", label: "Changed by" },
  { key: "summary", label: "Change" },
];

const CATEGORY_STYLES: Record<string, string> = {
  permissions:
    "border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] text-[color:var(--color-violet-text)]",
  email_settings: "border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]",
  sla_settings: "border-amber-border bg-amber-bg text-amber-text-strong",
};

const CATEGORY_LABELS: Record<string, string> = {
  permissions: "Permissions",
  email_settings: "Email settings",
  sla_settings: "SLA settings",
};

const SEARCH_FIELDS: (keyof SettingsAuditRow)[] = ["actorName", "summary", "target"];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function SettingsAuditTable({ entries }: { entries: SettingsAuditRow[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [actorFilter, setActorFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "createdAt",
    direction: "desc",
  });

  const categories = useMemo(() => uniqueSorted(entries.map((e) => e.category)), [entries]);
  const actors = useMemo(() => uniqueSorted(entries.map((e) => e.actorName)), [entries]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return entries.filter((e) => {
      if (categoryFilter !== "All" && e.category !== categoryFilter) return false;
      if (actorFilter !== "All" && e.actorName !== actorFilter) return false;
      const t = new Date(e.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      if (!q) return true;
      return SEARCH_FIELDS.some((field) => String(e[field] ?? "").toLowerCase().includes(q));
    });
  }, [entries, search, categoryFilter, actorFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      if (sort.key === "createdAt") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort.direction === "asc" ? diff : -diff;
      }
      const diff = a[sort.key].localeCompare(b[sort.key]);
      return sort.direction === "asc" ? diff : -diff;
    });
    return rows;
  }, [filtered, sort]);

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center gap-[9px] rounded-[12px] border border-card-border bg-white px-[13.5px] py-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            strokeWidth={2.25}
            className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by changed by or change…"
            className="w-full rounded-full border border-card-border bg-paper py-[8.25px] pl-[32px] pr-[12px] text-[10.5px] text-ink outline-none focus:border-[color:var(--color-blue)]"
          />
        </div>
        <span className="inline-flex items-center gap-[4.5px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
          <SlidersHorizontal size={12} strokeWidth={2.25} />
          Filters
        </span>
        <FilterDropdown label="Category" value={categoryFilter} onChange={setCategoryFilter} options={categories} />
        <FilterDropdown label="Changed by" value={actorFilter} onChange={setActorFilter} options={actors} />
        <div className="flex items-center gap-[6px]">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            aria-label="From date"
            className="rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[9.75px] text-ink outline-none focus:border-[color:var(--color-blue)]"
          />
          <span className="text-[9px] text-faint">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            aria-label="To date"
            className="rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[9.75px] text-ink outline-none focus:border-[color:var(--color-blue)]"
          />
        </div>
      </div>

      <span className="text-[9px] text-faint">
        Showing {sorted.length} of {entries.length} changes
      </span>

      <div className="overflow-x-auto rounded-[12px] border border-card-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-[10.5px]">
          <thead>
            <tr className="border-b border-card-border bg-result-bg/50 text-[9px] uppercase tracking-[0.06em] text-muted-2">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-[15px] py-[10.5px] font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex cursor-pointer select-none items-center gap-[4.5px] hover:text-ink"
                  >
                    {col.label}
                    {sort.key === col.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp size={11} strokeWidth={2.5} className="text-[color:var(--color-blue)]" />
                      ) : (
                        <ArrowDown size={11} strokeWidth={2.5} className="text-[color:var(--color-blue)]" />
                      )
                    ) : (
                      <ChevronsUpDown size={11} strokeWidth={2.25} className="text-faint" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr
                key={e.id}
                className={`border-b border-divider transition-colors last:border-b-0 hover:bg-result-bg/40 ${
                  i % 2 === 1 ? "bg-result-bg/20" : ""
                }`}
              >
                <td className="whitespace-nowrap px-[15px] py-[12px] text-[9px] text-faint">
                  {e.createdAtLabel}
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  <span
                    className={`inline-flex items-center gap-[4.5px] rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                      CATEGORY_STYLES[e.category] ?? "border-pill-border bg-pill-bg text-pill-text"
                    }`}
                  >
                    <ShieldCheck size={9} strokeWidth={2.5} />
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px] font-medium text-ink">{e.actorName}</td>
                <td className="px-[15px] py-[12px] text-muted">
                  <span className="text-ink">{e.summary}</span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-[15px] py-[24px] text-center text-[10.5px] text-faint">
                  No settings changes match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
