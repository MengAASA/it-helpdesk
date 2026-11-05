"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Download,
  TimerReset,
  UserRound,
} from "lucide-react";
import type { tickets as TicketRow } from "@prisma/client";
import { isOverdue, isAtRisk, type SlaHours } from "@/app/lib/sla";
import { csvEscape } from "@/app/lib/csv";
import Avatar from "@/app/components/Avatar";
import FilterDropdown from "@/app/components/FilterDropdown";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { StatusDot, OverdueBadge, AtRiskBadge, PriorityBadge, PriorityDot } from "@/app/components/TicketBadges";
import { useDismiss } from "@/app/components/useDismiss";
import AssigneeLookup, { type AssigneeOption } from "./tickets/[ticketNumber]/AssigneeLookup";
import { SortHeader, Pagination } from "./listParts";
import { TEAM_DOT, teamShort } from "./teamStyle";

const BULK_STATUSES = ["Open", "In Progress", "Closed"] as const;
const BULK_PRIORITIES = ["High", "Normal", "Low"] as const;
const BULK_CHUNK_SIZE = 100;
const NEW_DATA_POLL_MS = 30_000;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Status tabs follow the ticket lifecycle rather than the alphabet. */
const STATUS_ORDER = ["Open", "In Progress", "Closed"];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type SortKey =
  | "ticket_number"
  | "subject"
  | "name"
  | "category"
  | "team"
  | "assigned_to"
  | "status"
  | "created_at"
  | "priority";

export const SORT_KEYS: readonly SortKey[] = [
  "ticket_number",
  "subject",
  "name",
  "category",
  "team",
  "assigned_to",
  "status",
  "created_at",
  "priority",
];

/**
 * Column slots shared by the header and every row, so they line up, with a divider between each.
 * Each secondary column only appears once the list card is wide enough for it (container
 * queries), which is what keeps the list free of horizontal scrolling at any screen or sidebar
 * width. Widths include the divider's padding.
 */
// Ten-pixel gaps and dividers (a touch tighter than the other admin lists) so all eight columns
// fit beside an open sidebar on a 1440px screen.
const SEP = "border-l border-card-border pl-[10px]";
const COL = {
  id: "hidden w-[168px] shrink-0 items-center whitespace-nowrap @min-[600px]:flex",
  // The divider before the issue only shows while the ID column sits to its left.
  issue: "flex min-w-0 flex-1 items-center gap-[8px] @min-[600px]:border-l @min-[600px]:border-card-border @min-[600px]:pl-[10px]",
  createdBy: `hidden w-[120px] shrink-0 items-center @min-[1000px]:flex ${SEP}`,
  team: `hidden w-[104px] shrink-0 items-center gap-[8px] @min-[1100px]:flex ${SEP}`,
  priority: `hidden w-[94px] shrink-0 items-center @min-[700px]:flex ${SEP}`,
  status: `hidden w-[104px] shrink-0 items-center gap-[8px] @min-[480px]:flex ${SEP}`,
  assignee: `hidden w-[140px] shrink-0 items-center gap-[8px] @min-[800px]:flex ${SEP}`,
  created: `hidden w-[92px] shrink-0 items-center whitespace-nowrap @min-[900px]:flex ${SEP}`,
} as const;

const UNASSIGNED = "Unassigned";
const PAGE_SIZE = 30;

const SEARCH_FIELDS = [
  "ticket_number",
  "subject",
  "message",
  "name",
  "email",
  "staff_no",
  "category",
  "team",
  "assigned_to",
  "status",
  "priority",
  "location",
  "department",
  "phone",
] as const satisfies readonly (keyof TicketRow)[];

type TicketWithLabel = TicketRow & {
  /** Full timestamp, used for the CSV export and the tooltip. */
  submittedLabel: string;
  /** "10 Sep 2026" and "14:32", formatted on the server so server and client render the same text. */
  createdDate: string;
  createdTime: string;
};

const EXPORT_COLUMNS: { key: keyof TicketWithLabel; header: string }[] = [
  { key: "ticket_number", header: "Ticket Number" },
  { key: "category", header: "Category" },
  { key: "team", header: "Team" },
  { key: "priority", header: "Priority" },
  { key: "status", header: "Status" },
  { key: "assigned_to", header: "Assigned To" },
  { key: "name", header: "Requester Name" },
  { key: "email", header: "Email" },
  { key: "staff_no", header: "Staff No" },
  { key: "phone", header: "Phone" },
  { key: "location", header: "Location" },
  { key: "department", header: "Department" },
  { key: "subject", header: "Subject" },
  { key: "submittedLabel", header: "Submitted" },
];

export type InitialFilters = {
  status: string;
  priority: string;
  team: string;
  category: string;
  assignee: string;
  overdueOnly: boolean;
  search: string;
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  page: number;
};

export default function TicketsTable({
  tickets,
  slaHours,
  canManage,
  assigneeOptions,
  initialFilters,
}: {
  tickets: TicketWithLabel[];
  slaHours: SlaHours;
  canManage: boolean;
  assigneeOptions: AssigneeOption[];
  initialFilters?: InitialFilters;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const [since, setSince] = useState<Date>(() => new Date());
  const [hasNewData, setHasNewData] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [pendingAction, setPendingAction] = useState<
    | { type: "status"; status: string }
    | { type: "assign"; assignedTo: string }
    | { type: "priority"; priority: string }
    | null
  >(null);
  const [applying, setApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState<
    | null
    | { kind: "success"; updated: number }
    | { kind: "partial"; updated: number; notFoundCount: number }
    | { kind: "error" }
  >(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? "All");
  const [priorityFilter, setPriorityFilter] = useState(initialFilters?.priority ?? "All");
  const [teamFilter, setTeamFilter] = useState(initialFilters?.team ?? "All");
  const [categoryFilter, setCategoryFilter] = useState(initialFilters?.category ?? "All");
  const [assigneeFilter, setAssigneeFilter] = useState(initialFilters?.assignee ?? "All");
  const [overdueOnly, setOverdueOnly] = useState(initialFilters?.overdueOnly ?? false);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: initialFilters?.sortKey ?? "created_at",
    direction: initialFilters?.sortDirection ?? "desc",
  });
  const [page, setPage] = useState(initialFilters?.page ?? 1);

  const statuses = useMemo(() => {
    const present = uniqueSorted(tickets.map((t) => t.status));
    return [...STATUS_ORDER.filter((s) => present.includes(s)), ...present.filter((s) => !STATUS_ORDER.includes(s))];
  }, [tickets]);
  const priorities = useMemo(() => uniqueSorted(tickets.map((t) => t.priority)), [tickets]);
  const teams = useMemo(() => uniqueSorted(tickets.map((t) => t.team)), [tickets]);
  const categories = useMemo(() => uniqueSorted(tickets.map((t) => t.category)), [tickets]);
  const assignees = useMemo(
    () => uniqueSorted(tickets.map((t) => t.assigned_to || UNASSIGNED)),
    [tickets]
  );

  function toggleSort(key: SortKey) {
    // Clicking the sorted column flips it; a new column starts newest-first for dates, A to Z otherwise.
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "created_at" ? "desc" : "asc" }
    );
  }

  // Every filter except status, so the status tabs can show how many tickets each one would leave.
  const matchingExceptStatus = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qCompact = q.replace(/[\s-]/g, "");
    return tickets.filter((t) => {
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (teamFilter !== "All" && t.team !== teamFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (assigneeFilter !== "All" && (t.assigned_to || UNASSIGNED) !== assigneeFilter) return false;
      if (overdueOnly && slaHours.enabled && !isOverdue(t, slaHours)) return false;
      if (!q) return true;
      // Ticket IDs also match without their dashes or spaces: "7k3f9q2m" finds TCK-7K3F-9Q2M.
      if (qCompact && t.ticket_number.toLowerCase().replace(/-/g, "").includes(qCompact)) return true;
      return SEARCH_FIELDS.some((field) => String(t[field] ?? "").toLowerCase().includes(q));
    });
  }, [tickets, search, priorityFilter, teamFilter, categoryFilter, assigneeFilter, overdueOnly, slaHours]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of matchingExceptStatus) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
    return counts;
  }, [matchingExceptStatus]);

  const filtered = useMemo(
    () => (statusFilter === "All" ? matchingExceptStatus : matchingExceptStatus.filter((t) => t.status === statusFilter)),
    [matchingExceptStatus, statusFilter]
  );

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      if (sort.key === "created_at") {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sort.direction === "asc" ? diff : -diff;
      }
      const av = String(a[sort.key] ?? "");
      const bv = String(b[sort.key] ?? "");
      const diff = av.localeCompare(bv);
      return sort.direction === "asc" ? diff : -diff;
    });
    return rows;
  }, [filtered, sort]);

  const filterSignature = `${search}|${statusFilter}|${priorityFilter}|${teamFilter}|${categoryFilter}|${assigneeFilter}|${overdueOnly}|${sort.key}|${sort.direction}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPage(1);
    setSelected(new Set());
    setSelectAllMatching(false);
    setBulkResult(null);
  }

  const hasFilters =
    search.trim() !== "" ||
    [priorityFilter, teamFilter, categoryFilter, assigneeFilter].some((v) => v !== "All") ||
    overdueOnly;

  function clearFilters() {
    setSearch("");
    setPriorityFilter("All");
    setTeamFilter("All");
    setCategoryFilter("All");
    setAssigneeFilter("All");
    setOverdueOnly(false);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("q", search.trim());
    if (statusFilter !== "All") qs.set("status", statusFilter);
    if (priorityFilter !== "All") qs.set("priority", priorityFilter);
    if (teamFilter !== "All") qs.set("team", teamFilter);
    if (categoryFilter !== "All") qs.set("category", categoryFilter);
    if (assigneeFilter !== "All") qs.set("assignee", assigneeFilter);
    if (overdueOnly) qs.set("overdue", "1");
    if (sort.key !== "created_at" || sort.direction !== "desc") {
      qs.set("sort", sort.key);
      qs.set("dir", sort.direction);
    }
    if (currentPage !== 1) qs.set("page", String(currentPage));

    const query = qs.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [
    search,
    statusFilter,
    priorityFilter,
    teamFilter,
    categoryFilter,
    assigneeFilter,
    overdueOnly,
    sort,
    currentPage,
  ]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasNewData) return;
      try {
        const res = await fetch(
          `${basePath}/api/admin/tickets/changes?since=${encodeURIComponent(since.toISOString())}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.hasChanges) setHasNewData(true);
      } catch {
        // Transient network hiccup, try again next tick.
      }
    }, NEW_DATA_POLL_MS);
    return () => clearInterval(interval);
  }, [since, hasNewData, basePath]);

  function refreshForNewData() {
    setHasNewData(false);
    setSince(new Date());
    router.refresh();
  }

  function exportCsv() {
    const lines = [
      EXPORT_COLUMNS.map((c) => csvEscape(c.header)).join(","),
      ...sorted.map((t) => EXPORT_COLUMNS.map((c) => csvEscape(t[c.key])).join(",")),
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const pageTicketNumbers = useMemo(() => paginated.map((t) => t.ticket_number), [paginated]);
  const pageAllSelected = pageTicketNumbers.length > 0 && pageTicketNumbers.every((tn) => selected.has(tn));
  const headerChecked = selectAllMatching || pageAllSelected;
  const headerIndeterminate = !headerChecked && pageTicketNumbers.some((tn) => selected.has(tn));
  const showSelectAllBanner = !selectAllMatching && pageAllSelected && sorted.length > paginated.length;
  const selectionCount = selectAllMatching ? sorted.length : selected.size;

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate]);

  function toggleSelectPage() {
    if (headerChecked) {
      setSelected(new Set());
      setSelectAllMatching(false);
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageTicketNumbers.forEach((tn) => next.add(tn));
        return next;
      });
    }
  }

  function toggleSelectRow(ticketNumber: string) {
    if (selectAllMatching) {
      setSelected(new Set(sorted.map((t) => t.ticket_number).filter((tn) => tn !== ticketNumber)));
      setSelectAllMatching(false);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticketNumber)) next.delete(ticketNumber);
      else next.add(ticketNumber);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectAllMatching(false);
  }

  async function handleApplyBulk() {
    if (!pendingAction) return;
    const ticketNumbers = selectAllMatching ? sorted.map((t) => t.ticket_number) : Array.from(selected);
    setApplying(true);
    try {
      let updated = 0;
      let notFoundCount = 0;
      for (const c of chunk(ticketNumbers, BULK_CHUNK_SIZE)) {
        const res = await fetch(`${basePath}/api/admin/tickets/bulk`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketNumbers: c,
            ...(pendingAction.type === "status"
              ? { status: pendingAction.status }
              : pendingAction.type === "priority"
              ? { priority: pendingAction.priority }
              : { assignedTo: pendingAction.assignedTo }),
          }),
        });
        if (!res.ok) throw new Error("bulk update failed");
        const data = await res.json();
        updated += data.updated;
        notFoundCount += data.notFound.length;
      }
      setBulkResult(notFoundCount > 0 ? { kind: "partial", updated, notFoundCount } : { kind: "success", updated });
      clearSelection();
      setBulkAssignee("");
      setPendingAction(null);
      setHasNewData(false);
      setSince(new Date());
      router.refresh();
    } catch {
      setBulkResult({ kind: "error" });
    } finally {
      setApplying(false);
      setTimeout(() => setBulkResult(null), 4000);
    }
  }

  const bulkBarOpen = canManage && selectionCount > 0;

  return (
    // While the bulk bar floats at the bottom, leave room so it never covers the last rows.
    <div className={`flex flex-col gap-[12px] ${bulkBarOpen ? "pb-[64px]" : ""}`}>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {hasNewData && (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className={`fixed right-[20px] z-50 flex w-[300px] items-start gap-[10px] rounded-[12px] border border-card-border bg-surface p-[12px] shadow-pop ${
                  bulkBarOpen ? "bottom-[84px]" : "bottom-[20px]"
                }`}
              >
                <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                  <RefreshCw size={14} strokeWidth={2} />
                </span>
                <div className="flex flex-1 flex-col items-start gap-[8px]">
                  <span className="text-[13px] text-ink">New tickets or updates are available.</span>
                  <button
                    type="button"
                    onClick={refreshForNewData}
                    className="h-[28px] rounded-[7px] bg-primary px-[10px] text-[12px] font-medium text-white transition-colors hover:bg-primary-hover"
                  >
                    Refresh list
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setHasNewData(false)}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Toolbar: status tabs and view controls, then search and filters. */}
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <StatusTabs
          statuses={statuses}
          counts={statusCounts}
          total={matchingExceptStatus.length}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={exportCsv}
            disabled={sorted.length === 0}
            title={`Export ${sorted.length} ticket${sorted.length === 1 ? "" : "s"} to CSV`}
            className="inline-flex h-[30px] items-center gap-[6px] whitespace-nowrap rounded-[8px] border border-field-border hover:border-field-border-hover bg-surface px-[10px] text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} strokeWidth={1.75} />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[8px]">
        <div className="relative w-full sm:w-[260px]">
          <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, subject, requester…"
            aria-label="Filter tickets"
            className="h-[30px] w-full rounded-[8px] border border-field-border hover:border-field-border-hover bg-surface pl-[30px] pr-[10px] text-[13px] text-ink placeholder:text-faint outline-none"
          />
        </div>
        <FilterDropdown label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorities} />
        <FilterDropdown label="Team" value={teamFilter} onChange={setTeamFilter} options={teams} optionLabel={teamShort} />
        <FilterDropdown label="Category" value={categoryFilter} onChange={setCategoryFilter} options={categories} />
        <FilterDropdown label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter} options={assignees} />
        {slaHours.enabled && (
          <button
            type="button"
            onClick={() => setOverdueOnly((v) => !v)}
            aria-pressed={overdueOnly}
            className={`inline-flex h-[30px] items-center gap-[6px] rounded-[8px] border px-[10px] text-[13px] transition-colors ${
              overdueOnly
                ? "border-rose/25 bg-rose-light text-rose-text"
                : "border-field-border bg-surface hover:border-field-border-hover text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <TimerReset size={14} strokeWidth={1.75} />
            Overdue only
          </button>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-[30px] items-center gap-[4px] rounded-[8px] px-[8px] text-[13px] text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={14} strokeWidth={1.75} />
            Clear
          </button>
        )}
      </div>

      {canManage && showSelectAllBanner && (
        <div className="flex flex-wrap items-center gap-[6px] rounded-[10px] bg-primary-soft px-[12px] py-[8px] text-[13px] text-ink">
          <span>All {paginated.length} tickets on this page are selected.</span>
          <button type="button" onClick={() => setSelectAllMatching(true)} className="font-medium text-primary hover:underline">
            Select all {sorted.length} matching tickets
          </button>
        </div>
      )}

      {bulkResult && (
        <div
          role="status"
          className={`inline-flex h-[28px] w-fit items-center gap-[6px] rounded-[8px] px-[10px] text-[12px] font-medium ${
            bulkResult.kind === "success"
              ? "bg-emerald-light text-emerald-text"
              : bulkResult.kind === "partial"
              ? "bg-amber-bg text-amber-text"
              : "bg-rose-light text-rose-text"
          }`}
        >
          {bulkResult.kind === "error" ? <AlertCircle size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2} />}
          {bulkResult.kind === "success" && `Updated ${bulkResult.updated} ticket${bulkResult.updated === 1 ? "" : "s"}`}
          {bulkResult.kind === "partial" &&
            `Updated ${bulkResult.updated} ticket${bulkResult.updated === 1 ? "" : "s"}; ${bulkResult.notFoundCount} no longer exist${bulkResult.notFoundCount === 1 ? "s" : ""}`}
          {bulkResult.kind === "error" && "Failed to update tickets"}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        loading={applying}
        title={
          pendingAction?.type === "status"
            ? `Set ${selectionCount} ticket${selectionCount === 1 ? "" : "s"} to "${pendingAction.status}"?`
            : pendingAction?.type === "priority"
            ? `Set ${selectionCount} ticket${selectionCount === 1 ? "" : "s"} to "${pendingAction.priority}" priority?`
            : `Assign ${selectionCount} ticket${selectionCount === 1 ? "" : "s"} to ${
                pendingAction?.type === "assign" && pendingAction.assignedTo.trim()
                  ? pendingAction.assignedTo.trim()
                  : "Unassigned"
              }?`
        }
        description="This updates every selected ticket and may send status/assignment emails, if notifications are enabled."
        confirmLabel="Apply"
        onConfirm={handleApplyBulk}
        onCancel={() => !applying && setPendingAction(null)}
      />

      {/*
        A list laid out like a table: every column has a fixed slot and a divider, and the secondary
        ones only appear once the card is wide enough (container queries), so nothing ever needs a
        horizontal scrollbar.
      */}
      <section aria-label="Tickets" className="@container rounded-[16px] border border-card-border/50 bg-surface px-[6px] pb-[6px]">
        {/* Column headers double as the sort controls. */}
        <div className="flex h-[40px] items-stretch gap-[10px] border-b border-card-border px-[10px] text-[12px] font-medium text-muted-2">
          {canManage && (
            <span className="flex shrink-0 items-center">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={headerChecked}
                onChange={toggleSelectPage}
                disabled={paginated.length === 0}
                className="h-[14px] w-[14px] accent-primary"
                aria-label="Select all tickets on this page"
              />
            </span>
          )}
          <SortHeader label="Ticket ID" sortKey="ticket_number" sort={sort} onSort={toggleSort} className={COL.id} />
          <SortHeader label="Issue" sortKey="subject" sort={sort} onSort={toggleSort} className={COL.issue} />
          <SortHeader label="Created by" sortKey="name" sort={sort} onSort={toggleSort} className={COL.createdBy} />
          <SortHeader label="Team" sortKey="team" sort={sort} onSort={toggleSort} className={COL.team} />
          <SortHeader label="Priority" sortKey="priority" sort={sort} onSort={toggleSort} className={COL.priority} />
          <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} className={COL.status} />
          <SortHeader label="Assignee" sortKey="assigned_to" sort={sort} onSort={toggleSort} className={COL.assignee} />
          <SortHeader label="Created at" sortKey="created_at" sort={sort} onSort={toggleSort} className={COL.created} />
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-[4px] px-[16px] py-[48px] text-center">
            <p className="text-[13px] font-medium text-ink">Nothing matches</p>
            <p className="text-[12px] text-muted-2">Try another search, or loosen a filter.</p>
            {(hasFilters || statusFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setStatusFilter("All");
                }}
                className="mt-[10px] h-[28px] rounded-[7px] border border-field-border hover:border-field-border-hover px-[10px] text-[12px] text-ink transition-colors hover:bg-surface-2"
              >
                Show all tickets
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col pt-[4px]">
            {paginated.map((t) => {
              const rowSelected = selectAllMatching || selected.has(t.ticket_number);
              const overdue = isOverdue(t, slaHours);
              const atRisk = !overdue && isAtRisk(t, slaHours);
              const assignee = t.assigned_to || null;
              return (
                <li
                  key={t.id}
                  className={`relative flex h-[40px] items-stretch gap-[10px] rounded-[8px] px-[10px] text-[13px] transition-colors duration-150 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring ${
                    rowSelected ? "bg-primary-soft" : "hover:bg-surface-2/50"
                  }`}
                >
                  {canManage && (
                    <span className="relative z-10 flex shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={rowSelected}
                        onChange={() => toggleSelectRow(t.ticket_number)}
                        className="h-[14px] w-[14px] accent-primary"
                        aria-label={`Select ticket ${t.ticket_number}`}
                      />
                    </span>
                  )}
                  <span className={`${COL.id} font-mono-plex text-[12px] text-muted`}>{t.ticket_number}</span>
                  <span className={COL.issue}>
                    {/* The link's ::after stretches over the whole row, so the row is one big click target. */}
                    <Link
                      href={`/admin/tickets/${t.ticket_number}`}
                      title={t.subject}
                      className="min-w-0 truncate font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-[8px] after:content-['']"
                    >
                      {t.subject}
                    </Link>
                    {overdue && <OverdueBadge />}
                    {atRisk && <AtRiskBadge />}
                  </span>
                  <span className={COL.createdBy}>
                    <span className="truncate text-ink" title={t.name}>
                      {t.name}
                    </span>
                  </span>
                  <span className={COL.team}>
                    {t.team ? (
                      <>
                        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${TEAM_DOT[t.team] ?? "bg-faint"}`} aria-hidden="true" />
                        <span className="truncate text-ink" title={t.team}>
                          {teamShort(t.team)}
                        </span>
                      </>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </span>
                  <span className={COL.priority}>
                    <PriorityBadge priority={t.priority} />
                  </span>
                  <span className={COL.status}>
                    <StatusDot status={t.status} />
                    <span className="truncate text-ink">{t.status}</span>
                  </span>
                  <span className={`${COL.assignee} min-w-0`}>
                    {assignee ? (
                      <>
                        <Avatar name={assignee} size={20} />
                        <span className="truncate text-ink" title={assignee}>
                          {assignee}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border border-dashed border-faint/60 text-faint">
                          <UserRound size={11} strokeWidth={2} />
                        </span>
                        <span className="truncate text-faint">{UNASSIGNED}</span>
                      </>
                    )}
                  </span>
                  <span className={`${COL.created} tabular-nums text-ink`} title={`${t.createdDate} ${t.createdTime}`}>
                    {t.createdDate}
                  </span>
                  {/* Phone-width cards keep only a status dot. */}
                  <span className="flex items-center @min-[480px]:hidden">
                    <StatusDot status={t.status} />
                    <span className="sr-only">{t.status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-[8px]">
        <span className="text-[12px] text-muted-2 tabular-nums">
          {sorted.length === 0
            ? "No tickets"
            : `Showing ${rangeStart}–${rangeEnd} of ${sorted.length.toLocaleString()} ticket${sorted.length === 1 ? "" : "s"}`}
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
      </div>

      {/* Bulk actions float over the list while anything is selected, like a command bar. */}
      <AnimatePresence>
        {bulkBarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="pointer-events-none fixed inset-x-0 bottom-[20px] z-40 flex justify-center px-[16px]"
          >
            <div
              role="toolbar"
              aria-label="Bulk actions"
              className="pointer-events-auto flex flex-wrap items-center gap-[2px] rounded-[12px] bg-navy p-[6px] text-white shadow-[0_12px_32px_rgba(15,23,42,0.28)]"
            >
              <span className="px-[8px] text-[13px] font-medium tabular-nums">{selectionCount} selected</span>
              <BarButton onClick={clearSelection} label="Clear selection" iconOnly>
                <X size={14} strokeWidth={2} />
              </BarButton>
              <span className="mx-[4px] h-[18px] w-px bg-white/15" aria-hidden="true" />
              <BulkMenu
                label="Status"
                disabled={applying}
                options={BULK_STATUSES.map((s) => ({ value: s, icon: <StatusDot status={s} /> }))}
                onPick={(s) => setPendingAction({ type: "status", status: s })}
              />
              <BulkMenu
                label="Priority"
                disabled={applying}
                options={BULK_PRIORITIES.map((p) => ({ value: p, icon: <PriorityDot priority={p} /> }))}
                onPick={(p) => setPendingAction({ type: "priority", priority: p })}
              />
              <AssignMenu
                value={bulkAssignee}
                onChange={setBulkAssignee}
                options={assigneeOptions}
                disabled={applying}
                onApply={() => setPendingAction({ type: "assign", assignedTo: bulkAssignee })}
              />
              {applying && (
                <span className="inline-flex items-center gap-[6px] px-[8px] text-[12px] text-white/70">
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  Applying…
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Segmented status filter; the active pill slides between tabs. */
function StatusTabs({
  statuses,
  counts,
  total,
  value,
  onChange,
}: {
  statuses: string[];
  counts: Map<string, number>;
  total: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const tabs = [{ value: "All", label: "All", count: total }, ...statuses.map((s) => ({ value: s, label: s, count: counts.get(s) ?? 0 }))];
  return (
    <div
      role="tablist"
      aria-label="Status"
      className="inline-flex h-[32px] max-w-full items-center overflow-x-auto rounded-[9px] border border-field-border bg-surface-2 p-[2px]"
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`relative flex h-[26px] shrink-0 items-center gap-[6px] whitespace-nowrap rounded-[7px] px-[10px] text-[13px] transition-colors ${
              active ? "text-ink" : "text-muted-2 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="ticket-status-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[7px] bg-surface shadow-card"
              />
            )}
            <span className="relative flex items-center gap-[6px]">
              {tab.value !== "All" && <StatusDot status={tab.value} />}
              {tab.label}
              <span className={`text-[12px] tabular-nums ${active ? "text-muted-2" : "text-faint"}`}>{tab.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BarButton({
  label,
  onClick,
  disabled,
  iconOnly,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  iconOnly?: boolean;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={iconOnly ? label : undefined}
      aria-expanded={expanded}
      title={iconOnly ? label : undefined}
      className={`inline-flex h-[30px] items-center gap-[6px] rounded-[8px] text-[13px] text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        iconOnly ? "w-[30px] justify-center" : "px-[10px]"
      } ${expanded ? "bg-white/10 text-white" : ""}`}
    >
      {children}
    </button>
  );
}

/** A bulk-bar menu that opens upward, since the bar sits at the bottom of the screen. */
function BulkMenu({
  label,
  options,
  onPick,
  disabled,
}: {
  label: string;
  options: { value: string; icon: React.ReactNode }[];
  onPick: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <BarButton label={label} onClick={() => setOpen((v) => !v)} disabled={disabled} expanded={open}>
        {label}
        <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform duration-200 ${open ? "" : "rotate-180"}`} />
      </BarButton>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[160px] rounded-[10px] border border-card-border bg-surface p-[4px] text-ink shadow-pop"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPick(o.value);
                }}
                className="flex h-[30px] w-full items-center gap-[8px] rounded-[6px] px-[8px] text-left text-[13px] transition-colors hover:bg-surface-2"
              >
                {o.icon}
                {o.value}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignMenu({
  value,
  onChange,
  options,
  disabled,
  onApply,
}: {
  value: string;
  onChange: (name: string) => void;
  options: AssigneeOption[];
  disabled?: boolean;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <BarButton label="Assign" onClick={() => setOpen((v) => !v)} disabled={disabled} expanded={open}>
        <UserRound size={14} strokeWidth={1.75} />
        Assign
      </BarButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="absolute bottom-[calc(100%+10px)] right-0 z-50 flex w-[300px] items-center gap-[6px] rounded-[10px] border border-card-border bg-surface p-[8px] text-ink shadow-pop sm:left-0 sm:right-auto"
          >
            <AssigneeLookup value={value} onChange={onChange} options={options} disabled={disabled} placement="top" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onApply();
              }}
              className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={14} strokeWidth={2} />
              Apply
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
