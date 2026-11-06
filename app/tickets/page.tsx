"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpDown, Check, ChevronRight, Loader2, MessageSquareText, Paperclip, Search, SearchX, X } from "lucide-react";
import FilterDropdown from "@/app/components/FilterDropdown";
import { PriorityBadge, StatusDot } from "@/app/components/TicketBadges";
import { useDismiss } from "@/app/components/useDismiss";
import { Pagination } from "@/app/admin/listParts";
import { expandTicketInput } from "@/app/lib/ticketNumberFormat";

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

const EASE = [0.22, 1, 0.36, 1] as const;
const STATUSES = ["Open", "In Progress", "Closed"] as const;
const PRIORITIES = ["High", "Normal", "Low"];
const PAGE_SIZE = 20;

type SortKey = "ticketNumber" | "name" | "status" | "priority" | "createdAt";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { High: 3, Normal: 2, Low: 1 };
const STATUS_RANK: Record<string, number> = { Open: 1, "In Progress": 2, Closed: 3 };

/** Every way the list could be sorted before, as one menu. */
const SORTS: { label: string; key: SortKey; dir: SortDir }[] = [
  { label: "Newest first", key: "createdAt", dir: "desc" },
  { label: "Oldest first", key: "createdAt", dir: "asc" },
  { label: "Priority, high first", key: "priority", dir: "desc" },
  { label: "Status", key: "status", dir: "asc" },
  { label: "Ticket ID", key: "ticketNumber", dir: "asc" },
  { label: "Requester A–Z", key: "name", dir: "asc" },
];

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

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** "just now", "3 hours ago", "2 days ago", then the date once it's older than a month. */
function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Tickets() {
  return (
    <Suspense fallback={null}>
      <TicketsLookup />
    </Suspense>
  );
}

function TicketsLookup() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState(searchParams.get("ticket") ?? "");
  const [staffNo, setStaffNo] = useState(searchParams.get("staff") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Ticket[] | null>(null);
  const [now, setNow] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function runSearch(ticket: string, staff: string) {
    if (!ticket.trim() && !staff.trim()) {
      setError("Enter a ticket ID or your staff ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ticket.trim()) params.set("ticketNumber", expandTicketInput(ticket));
      if (staff.trim()) params.set("staffNo", staff.trim());
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/tickets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not look up tickets");
      setResults(data);
      setNow(Date.now());
      setSortKey("createdAt");
      setSortDir("desc");
      setStatusFilter(null);
      setPriorityFilter("All");
      setPage(1);
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Keep the search in the address, so Back from a ticket brings the results back.
    const q = new URLSearchParams();
    if (ticketNumber.trim()) q.set("ticket", ticketNumber.trim());
    if (staffNo.trim()) q.set("staff", staffNo.trim());
    router.replace(q.size ? `${pathname}?${q.toString()}` : pathname, { scroll: false });
    void runSearch(ticketNumber, staffNo);
  };

  // Arriving with a search in the address (e.g. coming back from a ticket) runs it straight away.
  const initialSearch = useRef({ ticket: searchParams.get("ticket") ?? "", staff: searchParams.get("staff") ?? "" });
  useEffect(() => {
    const { ticket, staff } = initialSearch.current;
    if (ticket || staff) void runSearch(ticket, staff);
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Open: 0, "In Progress": 0, Closed: 0 };
    for (const t of results ?? []) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
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
        .filter((t) => priorityFilter === "All" || t.priority === priorityFilter),
    [sorted, statusFilter, priorityFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const requesters = Array.from(new Set((results ?? []).map((t) => t.name)));
  const hasFilters = !!statusFilter || priorityFilter !== "All";

  function goToPage(p: number) {
    setPage(p);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[20px] px-[16px] pb-[56px] pt-[28px] md:px-[32px] md:pt-[40px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Your tickets</h1>
        <p className="max-w-[520px] text-[13px] leading-[20px] text-muted-2">
          Check where your requests are up to, read replies from IT, and add more information.
        </p>
      </div>

      {/* The lookup: dark, front and centre. */}
      <form onSubmit={handleSearch} className="tile-ink @container rounded-[18px] p-[16px] md:p-[20px]">
        <div className="flex flex-col gap-[12px] @min-[720px]:flex-row @min-[720px]:items-end">
          <LookupField
            id="ticketNumber"
            label="Ticket ID"
            hint="Opens that one ticket"
            placeholder="TCK-7K3F-9Q2M"
            value={ticketNumber}
            onChange={setTicketNumber}
            mono
          />
          <span className="flex items-center gap-[10px] text-[12px] text-muted-2 @min-[720px]:h-[40px]" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10 @min-[720px]:hidden" />
            or
            <span className="h-px flex-1 bg-white/10 @min-[720px]:hidden" />
          </span>
          <LookupField
            id="staffNo"
            label="Staff ID"
            hint="Shows everything you've raised"
            placeholder="e.g. M0750"
            value={staffNo}
            onChange={setStaffNo}
          />
          <button
            type="submit"
            disabled={loading}
            className="group inline-flex h-[40px] shrink-0 items-center justify-center gap-[8px] rounded-[10px] bg-primary px-[18px] text-[13px] font-medium text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <Search size={14} strokeWidth={2} />}
            {loading ? "Looking…" : "Find tickets"}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-[13px] text-chart-pink"
            >
              <span className="block pt-[12px]">{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <div ref={resultsRef} className="scroll-mt-[72px]">
        <AnimatePresence mode="wait" initial={false}>
          {loading && !results ? (
            <motion.div key="loading" {...fade}>
              <SkeletonList />
            </motion.div>
          ) : results === null ? (
            <motion.div key="start" {...fade}>
              <StartHints />
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div key="none" {...fade} className="flex flex-col items-center gap-[6px] rounded-[16px] border border-card-border/70 bg-surface px-[20px] py-[48px] text-center">
              <span className="mb-[4px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-surface-2 text-muted-2">
                <SearchX size={16} strokeWidth={1.75} />
              </span>
              <p className="text-[13px] font-medium text-ink">No tickets found</p>
              <p className="max-w-[340px] text-[13px] leading-[20px] text-muted-2">
                Double-check the ticket ID or staff ID. Ticket IDs look like TCK-7K3F-9Q2M.
              </p>
            </motion.div>
          ) : (
            <motion.div key="results" {...fade} className={`flex flex-col gap-[12px] transition-opacity ${loading ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-[10px]">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
                    {requesters.length === 1 ? requesters[0] : `${results.length} tickets`}
                  </span>
                  <span className="text-[12px] tabular-nums text-muted-2">
                    {results.length} {results.length === 1 ? "ticket" : "tickets"} · {statusCounts.Open + statusCounts["In Progress"]} still open
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-[8px]">
                  <FilterDropdown
                    label="Priority"
                    value={priorityFilter}
                    onChange={(v) => {
                      setPriorityFilter(v);
                      setPage(1);
                    }}
                    options={PRIORITIES}
                  />
                  <SortMenu
                    value={SORTS.findIndex((s) => s.key === sortKey && s.dir === sortDir)}
                    onChange={(i) => {
                      setSortKey(SORTS[i].key);
                      setSortDir(SORTS[i].dir);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              <StatusTabs
                counts={statusCounts}
                total={results.length}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-[8px] rounded-[16px] border border-card-border/70 bg-surface px-[20px] py-[40px] text-center">
                  <p className="text-[13px] font-medium text-ink">Nothing matches these filters</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(null);
                      setPriorityFilter("All");
                      setPage(1);
                    }}
                    className="inline-flex h-[30px] items-center gap-[6px] rounded-[8px] border border-field-border px-[10px] text-[12px] text-ink transition-colors hover:bg-surface-2"
                  >
                    <X size={13} strokeWidth={2} />
                    Clear filters
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col overflow-hidden rounded-[16px] border border-card-border/70 bg-surface">
                  {pageItems.map((t, i) => (
                    <motion.li
                      key={t.ticketNumber}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.025, ease: EASE }}
                      className="border-t border-card-border/60 first:border-t-0"
                    >
                      <TicketRow ticket={t} now={now} />
                    </motion.li>
                  ))}
                </ul>
              )}

              {filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-[8px]">
                  <span className="text-[12px] tabular-nums text-muted-2">
                    {hasFilters ? `${filtered.length} of ${results.length}` : `${results.length}`} {results.length === 1 ? "ticket" : "tickets"}
                    {totalPages > 1 &&
                      ` · showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}`}
                  </span>
                  <Pagination page={currentPage} totalPages={totalPages} onPage={goToPage} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: EASE },
};

function LookupField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  mono,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
      <label htmlFor={id} className="flex items-baseline justify-between gap-[8px] text-[12px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="truncate text-muted-2">{hint}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`h-[40px] w-full rounded-[10px] border border-white/10 bg-white/[0.06] px-[12px] pr-[34px] text-[14px] text-ink outline-none transition-colors placeholder:text-faint hover:border-white/20 focus:bg-white/[0.09] ${
            mono ? "uppercase tracking-[0.02em] placeholder:normal-case placeholder:tracking-normal" : ""
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-[6px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[6px] text-muted-2 transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Before the first search: where to find each ID, instead of an empty box. */
function StartHints() {
  return (
    <div className="grid gap-[12px] md:grid-cols-2">
      <div className="rounded-[16px] border border-card-border/70 bg-surface p-[16px]">
        <h2 className="text-[13px] font-semibold text-ink">Got a ticket ID?</h2>
        <p className="mt-[4px] text-[13px] leading-[20px] text-muted-2">
          It looks like <span className="font-medium tabular-nums text-ink">TCK-7K3F-9Q2M</span> and appears on screen right after you submit.
          It opens that one ticket.
        </p>
      </div>
      <div className="rounded-[16px] border border-card-border/70 bg-surface p-[16px]">
        <h2 className="text-[13px] font-semibold text-ink">Use your staff ID</h2>
        <p className="mt-[4px] text-[13px] leading-[20px] text-muted-2">
          Lists every ticket raised with your staff number, newest first, so you can see them all in one place.
        </p>
      </div>
      <Link
        href="/submit"
        className="group flex items-center justify-between gap-[12px] rounded-[16px] border border-card-border/70 bg-surface-2/50 px-[16px] py-[14px] text-[13px] text-muted transition-colors hover:bg-surface-2 md:col-span-2"
      >
        <span>
          <span className="font-medium text-ink">Haven&apos;t raised one yet?</span> Describe the problem and Boboi will route it.
        </span>
        <span className="inline-flex shrink-0 items-center gap-[4px] font-medium text-primary">
          Submit a ticket
          <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-[2px]" />
        </span>
      </Link>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-[12px]" aria-label="Loading tickets" role="status">
      <span className="h-[18px] w-[180px] animate-pulse rounded-[6px] bg-surface-2" />
      <div className="overflow-hidden rounded-[16px] border border-card-border/70 bg-surface">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-[14px] border-t border-card-border/60 px-[16px] py-[16px] first:border-t-0">
            <div className="flex flex-1 flex-col gap-[8px]">
              <span className="h-[14px] animate-pulse rounded-[5px] bg-surface-2" style={{ width: `${60 - i * 8}%` }} />
              <span className="h-[11px] w-[40%] animate-pulse rounded-[5px] bg-surface-2/70" />
            </div>
            <span className="h-[22px] w-[90px] animate-pulse rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Status as tabs with counts; the pill slides to the chosen one. */
function StatusTabs({
  counts,
  total,
  value,
  onChange,
}: {
  counts: Record<string, number>;
  total: number;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const tabs: { key: string | null; label: string; count: number }[] = [
    { key: null, label: "All", count: total },
    ...STATUSES.map((s) => ({ key: s as string, label: s as string, count: counts[s] ?? 0 })),
  ];
  return (
    <div role="tablist" aria-label="Status" className="flex w-fit max-w-full items-center gap-[2px] overflow-x-auto rounded-[10px] border border-card-border/70 bg-surface p-[3px] [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`relative flex h-[30px] shrink-0 items-center gap-[6px] rounded-[7px] px-[8px] text-[13px] sm:gap-[7px] sm:px-[11px] transition-colors ${active ? "text-paper" : "text-muted hover:text-ink"}`}
          >
            {active && (
              <motion.span layoutId="ticket-status-tab" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-[7px] bg-ink" />
            )}
            <span className="relative flex items-center gap-[7px]">
              {t.key && <StatusDot status={t.key} />}
              {t.label}
              <span className={`text-[12px] tabular-nums ${active ? "text-paper/70" : "text-faint"}`}>{t.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SortMenu({ value, onChange }: { value: number; onChange: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const current = SORTS[value] ?? SORTS[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-[30px] items-center gap-[6px] whitespace-nowrap rounded-[8px] border border-field-border bg-surface px-[10px] text-[13px] text-muted transition-colors hover:border-field-border-hover hover:bg-surface-2 hover:text-ink"
      >
        <ArrowUpDown size={13} strokeWidth={1.75} />
        {current.label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Sort"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: EASE }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[190px] rounded-[10px] border border-card-border bg-surface p-[4px] shadow-pop"
          >
            {SORTS.map((s, i) => (
              <li
                key={s.label}
                role="option"
                aria-selected={i === value}
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
                className="flex h-[32px] cursor-pointer items-center justify-between gap-[10px] rounded-[7px] px-[10px] text-[13px] text-ink hover:bg-surface-2"
              >
                {s.label}
                {i === value && <Check size={14} strokeWidth={2} className="text-primary" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Where the ticket is: three short segments that fill up to its status. */
function StatusTrack({ status }: { status: string }) {
  const reached = STATUS_RANK[status] ?? 1;
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-[4px] w-[14px] rounded-full ${n <= reached ? (reached === 3 ? "bg-lime-bright" : "bg-primary") : "bg-surface-2"}`}
        />
      ))}
    </span>
  );
}

function TicketRow({ ticket: t, now }: { ticket: Ticket; now: number }) {
  return (
    <Link
      href={`/tickets/${encodeURIComponent(t.ticketNumber)}`}
      className="group flex items-center gap-[14px] px-[16px] py-[14px] transition-colors duration-150 hover:bg-surface-2/50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <div className="flex min-w-0 items-start gap-[8px] sm:items-center">
          <span className="line-clamp-2 min-w-0 text-[13px] font-medium text-ink sm:line-clamp-none sm:truncate">{t.subject || t.category}</span>
          {t.replies.length > 0 && (
            <span
              className="inline-flex h-[20px] shrink-0 items-center gap-[4px] rounded-full bg-primary-soft px-[7px] text-[11px] font-medium text-primary"
              title={`${t.replies.length} ${t.replies.length === 1 ? "reply" : "replies"} from IT`}
            >
              <MessageSquareText size={11} strokeWidth={2} />
              {t.replies.length}
              <span className="hidden sm:inline">{t.replies.length === 1 ? "reply" : "replies"}</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[2px] text-[12px] text-muted-2">
          <span className="tabular-nums text-muted">{t.ticketNumber}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden truncate sm:inline">{t.category}</span>
          <span aria-hidden="true">·</span>
          <span title={formatTimestamp(t.createdAt)}>{timeAgo(t.createdAt, now)}</span>
          {t.attachments.length > 0 && (
            <span className="inline-flex items-center gap-[3px]" title={`${t.attachments.length} attachment${t.attachments.length === 1 ? "" : "s"}`}>
              <Paperclip size={11} strokeWidth={1.75} />
              {t.attachments.length}
            </span>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-[6px] sm:flex">
        <span className="inline-flex items-center gap-[6px] text-[12px] font-medium text-ink">
          <StatusDot status={t.status} />
          {t.status}
        </span>
        <StatusTrack status={t.status} />
      </div>
      <span className="hidden w-[78px] shrink-0 justify-end md:flex">
        <PriorityBadge priority={t.priority} />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[4px] sm:hidden">
        <span className="inline-flex items-center gap-[5px] text-[12px] text-ink">
          <StatusDot status={t.status} />
          {t.status}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-[2px] group-hover:text-ink" />
    </Link>
  );
}
