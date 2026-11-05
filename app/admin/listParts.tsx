"use client";

import { ChevronLeft, ChevronRight, ChevronsUpDown, CircleArrowDown, CircleArrowUp } from "lucide-react";

/*
 * Pieces shared by the admin lists (tickets, activity): sortable column headers and the
 * pagination footer, so every list sorts and pages the same way.
 */

export type ListSort<K extends string> = { key: K; direction: "asc" | "desc" };

/** The divider and spacing every list column after the first carries, in the header and the rows. */
export const COL_SEP = "border-l border-card-border pl-[12px]";

/** A column header that sorts by its column; the active one shows its direction. */
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  sort: ListSort<K>;
  onSort: (key: K) => void;
  className: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? CircleArrowUp : CircleArrowDown;
  return (
    <span className={`${className} items-center`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label.toLowerCase()}${active ? `, currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`}
        className={`-mx-[4px] inline-flex h-[24px] items-center gap-[5px] whitespace-nowrap rounded-[5px] px-[4px] transition-colors hover:bg-surface-2 hover:text-ink ${
          active ? "text-ink" : ""
        }`}
      >
        {label}
        <Icon size={13} strokeWidth={1.75} className={active ? "text-ink" : "text-faint"} />
      </button>
    </span>
  );
}

export function PageButton({
  label,
  onClick,
  disabled,
  current,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`flex h-[28px] min-w-[28px] items-center justify-center rounded-[7px] px-[6px] text-[12px] font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        current ? "bg-primary text-white" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Page numbers with ellipses: 1 … 4 5 6 … 12. */
export function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

/** Previous / numbered / next page controls. Renders nothing for a single page. */
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center gap-[4px]">
      <PageButton label="Previous page" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>
        <ChevronLeft size={14} strokeWidth={1.75} />
      </PageButton>
      {getPageNumbers(page, totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-[4px] text-[12px] text-faint">
            …
          </span>
        ) : (
          <PageButton key={p} label={`Page ${p}`} onClick={() => onPage(p)} current={p === page}>
            {p}
          </PageButton>
        )
      )}
      <PageButton label="Next page" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
        <ChevronRight size={14} strokeWidth={1.75} />
      </PageButton>
    </nav>
  );
}
