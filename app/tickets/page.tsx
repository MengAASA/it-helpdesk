"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Hash,
  IdCard,
  AlertTriangle,
  SearchX,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  MessageSquareText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Inbox,
  Filter,
  X,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";

type Reply = {
  authorName: string;
  message: string;
  createdAt: string;
};

type Ticket = {
  ticketNumber: string;
  category: string;
  team: string;
  priority: string;
  status: string;
  name: string;
  subject: string;
  message: string;
  createdAt: string;
  userRequestTypes: string[];
  attachments: { filename: string; size: number }[];
  replies: Reply[];
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUSES = ["Open", "In Progress", "Closed"] as const;
const PRIORITIES = ["High", "Normal", "Low"] as const;

const STATUS_STYLES: Record<string, string> = {
  Open: "border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]",
  "In Progress": "border-amber-border bg-amber-bg text-amber-text-strong",
  Closed:
    "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const STATUS_DOT: Record<string, string> = {
  Open: "bg-[color:var(--color-blue)]",
  "In Progress": "bg-amber-solid",
  Closed: "bg-[color:var(--color-emerald)]",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const PRIORITY_BAR: Record<string, string> = {
  High: "bg-[color:var(--color-rose)]",
  Normal: "bg-[color:var(--color-blue)]/50",
  Low: "bg-[color:var(--color-emerald)]/60",
};

function SearchField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  icon: typeof Hash;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <Icon
        size={13}
        strokeWidth={2}
        className={`pointer-events-none absolute left-[12px] top-[19.5px] transition-colors ${
          floated ? "text-primary" : "text-faint"
        }`}
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={floated ? placeholder : ""}
        className="w-full rounded-[9px] border border-card-border bg-paper py-[8.25px] pb-[8.25px] pl-[33px] pr-[12px] pt-[19.5px] font-body text-[12px] text-ink outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/10"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-[33px] transition-all duration-150 ${
          floated
            ? "top-[6px] text-[8.5px] font-semibold uppercase tracking-[0.12em] text-primary"
            : "top-[14px] text-[12px] text-faint"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

type SortKey = "ticketNumber" | "name" | "status" | "priority" | "createdAt";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { High: 3, Normal: 2, Low: 1 };
const STATUS_RANK: Record<string, number> = {
  Open: 1,
  "In Progress": 2,
  Closed: 3,
};

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  ticketNumber: "asc",
  name: "asc",
  status: "asc",
  priority: "desc",
  createdAt: "desc",
};

function sortValue(t: Ticket, key: SortKey): string | number {
  switch (key) {
    case "priority":
      return PRIORITY_RANK[t.priority] ?? 0;
    case "status":
      return STATUS_RANK[t.status] ?? 0;
    case "createdAt":
      return new Date(t.createdAt).getTime();
    case "name":
      return t.name.toLowerCase();
    default:
      return t.ticketNumber;
  }
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-[15px] py-[10.5px] font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-[4.5px] transition-colors ${
          active ? "text-ink" : "hover:text-ink"
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={10} strokeWidth={2.5} className="text-primary" />
          ) : (
            <ArrowDown size={10} strokeWidth={2.5} className="text-primary" />
          )
        ) : (
          <ArrowUpDown size={10} strokeWidth={2.25} className="text-faint/70" />
        )}
      </button>
    </th>
  );
}

function FilterDropdown({
  label,
  allLabel,
  options,
  value,
  onChange,
  counts,
  total,
  dotClass,
}: {
  label: string;
  allLabel: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
  counts: Record<string, number>;
  total: number;
  dotClass: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const menu = menuRef.current;
    if (!container || !menu) return;
    const containerRect = container.getBoundingClientRect();
    const spaceBelow = window.innerHeight - containerRect.bottom;
    const spaceAbove = containerRect.top;
    setOpenUpward(
      spaceBelow < menu.offsetHeight + 12 && spaceAbove > spaceBelow,
    );
  }, [open]);

  const items: { key: string | null; itemLabel: string; count: number }[] = [
    { key: null, itemLabel: allLabel, count: total },
    ...options.map((opt) => ({
      key: opt,
      itemLabel: opt,
      count: counts[opt] ?? 0,
    })),
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-[9px] rounded-[10px] border px-[13.5px] py-[10.5px] text-[11px] font-medium transition-colors ${
          value
            ? "border-primary/40 bg-result-bg text-primary"
            : "border-card-border bg-white text-ink hover:border-primary/25"
        }`}
      >
        <span className="flex items-center gap-[7.5px]">
          {value ? (
            <span
              className={`h-[7.5px] w-[7.5px] rounded-full ${dotClass[value]}`}
            />
          ) : (
            <Filter size={12} strokeWidth={2.25} className="text-faint" />
          )}
          {value ?? label}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2.25}
          className={`shrink-0 transition-transform ${value ? "text-primary" : "text-faint"} ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`animate-phn-rise absolute z-20 w-full overflow-hidden rounded-[10px] border border-card-border bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ${
            openUpward ? "bottom-full mb-[6px]" : "top-full mt-[6px]"
          }`}
        >
          <ul role="listbox" className="py-[4.5px]">
            {items.map((opt) => {
              const active = value === opt.key;
              return (
                <li
                  key={opt.itemLabel}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-[9px] px-[13.5px] py-[9px] text-[11px] ${
                    active
                      ? "bg-result-bg text-primary"
                      : "text-ink hover:bg-paper"
                  }`}
                >
                  <span className="flex items-center gap-[7.5px]">
                    {opt.key ? (
                      <span
                        className={`h-[7.5px] w-[7.5px] rounded-full ${dotClass[opt.key]}`}
                      />
                    ) : (
                      <span className="h-[7.5px] w-[7.5px] rounded-full border border-card-border" />
                    )}
                    {opt.itemLabel}
                  </span>
                  <span className="flex items-center gap-[6px]">
                    <span className="font-mono-plex text-[9.5px] text-muted-2">
                      {opt.count}
                    </span>
                    {active && (
                      <Check
                        size={12}
                        strokeWidth={2.5}
                        className="text-primary"
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;

export default function Tickets() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [staffNo, setStaffNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Ticket[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim() && !staffNo.trim()) {
      setError("Enter a ticket number or staff ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ticketNumber.trim()) params.set("ticketNumber", ticketNumber.trim());
      if (staffNo.trim()) params.set("staffNo", staffNo.trim());
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tickets?${params.toString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not look up tickets");
      setResults(data);
      setSortKey("createdAt");
      setSortDir("desc");
      setStatusFilter(null);
      setPriorityFilter(null);
      setPage(1);
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_SORT_DIR[key]);
    }
    setPage(1);
  };

  const statusCounts = useMemo(() => {
    if (!results) return null;
    const byStatus: Record<string, number> = {
      Open: 0,
      "In Progress": 0,
      Closed: 0,
    };
    for (const t of results) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    return byStatus;
  }, [results]);

  const priorityCounts = useMemo(() => {
    if (!results) return null;
    const byPriority: Record<string, number> = { High: 0, Normal: 0, Low: 0 };
    for (const t of results)
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    return byPriority;
  }, [results]);

  const sorted = useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [results, sortKey, sortDir]);

  const filtered = useMemo(
    () =>
      sorted
        .filter((t) => !statusFilter || t.status === statusFilter)
        .filter((t) => !priorityFilter || t.priority === priorityFilter),
    [sorted, statusFilter, priorityFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-[27px] px-[42px] pb-[67.5px] pt-[42px]">
      <div className="flex flex-col gap-[10.5px]">
        <h1 className="font-heading text-[27px] font-semibold tracking-[-0.02em]">
          View my tickets
        </h1>
        <p className="max-w-[495px] text-[12.75px] leading-[1.6] text-muted">
          Enter your ticket number or staff ID to check the status of tickets
          you have submitted.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-[270px_1fr] lg:items-start">
        <div className="flex flex-col gap-[15px] lg:sticky lg:top-[84px]">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-[13.5px] rounded-[14px] border border-card-border bg-white px-[18px] py-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <SearchField
              id="ticketNumber"
              label="Ticket Number"
              icon={Hash}
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="e.g. TCK-XXXXXXX"
            />
            <SearchField
              id="staffNo"
              label="Staff No"
              icon={IdCard}
              value={staffNo}
              onChange={(e) => setStaffNo(e.target.value)}
            />
            {error && (
              <div className="flex items-center gap-[7.5px] rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
                <AlertTriangle size={12} strokeWidth={2.25} />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-[7.5px] whitespace-nowrap rounded-[9px] bg-admin-gradient px-[21px] py-[11.25px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(46,16,101,0.3)] transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Search size={13} strokeWidth={2.25} />
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {results && results.length > 0 && statusCounts && priorityCounts && (
            <div className="flex flex-col gap-[15px]">
              <div className="flex items-center justify-between px-[3px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Filters
                </span>
                {(statusFilter || priorityFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(null);
                      setPriorityFilter(null);
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-[3px] text-[9px] font-semibold text-primary transition-colors hover:text-primary/70"
                  >
                    <X size={10} strokeWidth={2.5} />
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-[7.5px]">
                <span className="px-[3px] text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Filter by status
                </span>
                <FilterDropdown
                  label="All statuses"
                  allLabel="All statuses"
                  options={STATUSES}
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  counts={statusCounts}
                  total={results.length}
                  dotClass={STATUS_DOT}
                />
              </div>
              <div className="flex flex-col gap-[7.5px]">
                <span className="px-[3px] text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Filter by priority
                </span>
                <FilterDropdown
                  label="All priorities"
                  allLabel="All priorities"
                  options={PRIORITIES}
                  value={priorityFilter}
                  onChange={(v) => {
                    setPriorityFilter(v);
                    setPage(1);
                  }}
                  counts={priorityCounts}
                  total={results.length}
                  dotClass={PRIORITY_BAR}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[13.5px]">
          {results === null && (
            <div className="flex flex-col items-center gap-[10.5px] rounded-[14px] border border-dashed border-card-border px-[27px] py-[60px] text-center">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-result-bg text-primary">
                <Search size={18} strokeWidth={1.8} />
              </span>
              <p className="max-w-[300px] text-[11.25px] leading-[1.6] text-muted">
                Your tickets will show up here once you search by ticket number
                or staff ID.
              </p>
            </div>
          )}

          {results && results.length === 0 && (
            <div className="flex flex-col items-center gap-[10.5px] rounded-[14px] border border-dashed border-card-border px-[27px] py-[60px] text-center">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-result-bg text-primary">
                <SearchX size={18} strokeWidth={1.8} />
              </span>
              <p className="text-[12px] font-medium text-ink">
                No tickets found
              </p>
              <p className="max-w-[300px] text-[11.25px] leading-[1.6] text-muted">
                Double-check the ticket number or staff ID and try again.
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-[9px]">
                <span className="inline-flex items-center gap-[6px] text-[9.5px] font-medium text-faint">
                  <Inbox size={11} strokeWidth={2} />
                  {filtered.length} of {results.length} ticket
                  {results.length > 1 ? "s" : ""}
                  {statusFilter ? ` · ${statusFilter}` : ""}
                  {priorityFilter ? ` · ${priorityFilter} priority` : ""}
                </span>
                {filtered.length > 0 && (
                  <span className="text-[9.5px] text-faint">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-[9px] rounded-[14px] border border-dashed border-card-border px-[27px] py-[45px] text-center">
                  <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-result-bg text-primary">
                    <SearchX size={16} strokeWidth={1.8} />
                  </span>
                  <p className="text-[11.25px] leading-[1.6] text-muted">
                    No tickets match{statusFilter ? ` ${statusFilter}` : ""}
                    {priorityFilter
                      ? `${statusFilter ? " and" : ""} ${priorityFilter} priority`
                      : ""}{" "}
                    in this result set.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-card-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <table className="w-full table-fixed border-collapse text-left text-[10.5px]">
                      <colgroup>
                        <col className="w-[36px]" />
                        <col className="w-[210px]" />
                        <col />
                        <col className="w-[100px]" />
                        <col className="w-[95px]" />
                        <col className="w-[120px]" />
                        <col className="w-[85px]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-card-border bg-result-bg/50 text-[9px] uppercase tracking-[0.06em] text-muted-2">
                          <th className="px-[15px] py-[10.5px] font-semibold">
                            #
                          </th>
                          <SortHeader
                            label="Ticket #"
                            sortKey="ticketNumber"
                            active={sortKey === "ticketNumber"}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <SortHeader
                            label="Requester"
                            sortKey="name"
                            active={sortKey === "name"}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <th className="px-[15px] py-[10.5px] font-semibold">
                            Team
                          </th>
                          <SortHeader
                            label="Status"
                            sortKey="status"
                            active={sortKey === "status"}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <SortHeader
                            label="Submitted"
                            sortKey="createdAt"
                            active={sortKey === "createdAt"}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <SortHeader
                            label="Priority"
                            sortKey="priority"
                            active={sortKey === "priority"}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                        </tr>
                      </thead>
                      <motion.tbody
                        initial="hidden"
                        animate="show"
                        variants={{
                          show: { transition: { staggerChildren: 0.03 } },
                        }}
                      >
                        {pageItems.map((t, i) => (
                          <motion.tr
                            key={t.ticketNumber}
                            variants={{
                              hidden: { opacity: 0, y: 6 },
                              show: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={`border-b border-divider transition-colors last:border-b-0 hover:bg-result-bg/40 ${
                              i % 2 === 1 ? "bg-result-bg/20" : ""
                            }`}
                          >
                            <td className="px-[15px] py-[12px] text-faint">
                              {(currentPage - 1) * PAGE_SIZE + i + 1}
                            </td>
                            <td className="overflow-hidden whitespace-nowrap px-[15px] py-[12px] font-mono-plex">
                              <span
                                className={`mr-[9px] inline-block h-[7.5px] w-[7.5px] rounded-full align-middle ${
                                  PRIORITY_BAR[t.priority] ??
                                  PRIORITY_BAR.Normal
                                }`}
                              />
                              <Link
                                href={`/tickets/${t.ticketNumber}`}
                                className="inline-flex items-center gap-[4.5px] rounded-full border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] px-[9px] py-[4.5px] text-[9.75px] font-semibold text-[color:var(--color-blue-text)] transition-colors hover:bg-[color:var(--color-blue)] hover:text-paper"
                              >
                                {t.ticketNumber}
                              </Link>
                              {t.replies.length > 0 && (
                                <span className="ml-[7.5px] inline-flex items-center gap-[3px] rounded-full border border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] px-[6px] py-[1.5px] text-[8px] font-semibold text-[color:var(--color-emerald-text)]">
                                  <MessageSquareText
                                    size={9}
                                    strokeWidth={2.5}
                                  />
                                  {t.replies.length}
                                </span>
                              )}
                            </td>
                            <td className="px-[15px] py-[12px] text-muted">
                              <div className="flex min-w-0 items-center gap-[7.5px]">
                                <Avatar name={t.name} size={22} />
                                <span className="min-w-0 truncate text-ink">
                                  {t.name}
                                </span>
                              </div>
                            </td>
                            <td className="truncate px-[15px] py-[12px] text-muted">
                              {t.team}
                            </td>
                            <td className="whitespace-nowrap px-[15px] py-[12px]">
                              <span
                                className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                                  STATUS_STYLES[t.status] ?? STATUS_STYLES.Open
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-[15px] py-[12px] text-[9px] text-faint">
                              {formatTimestamp(t.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-[15px] py-[12px]">
                              <span
                                className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                                  PRIORITY_STYLES[t.priority] ??
                                  PRIORITY_STYLES.Normal
                                }`}
                              >
                                {t.priority}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-[9px]">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-[4.5px] rounded-[7.5px] border border-card-border bg-white px-[10.5px] py-[6px] text-[9.75px] font-semibold text-ink transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronLeft size={12} strokeWidth={2.5} />
                        Prev
                      </button>
                      <span className="text-[9.5px] font-medium text-muted-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-[4.5px] rounded-[7.5px] border border-card-border bg-white px-[10.5px] py-[6px] text-[9.75px] font-semibold text-ink transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Next
                        <ChevronRight size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
