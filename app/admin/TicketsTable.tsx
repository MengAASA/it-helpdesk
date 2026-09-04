"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  SlidersHorizontal,
  TimerReset,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import type { tickets as TicketRow } from "@prisma/client";
import { isOverdue, type SlaHours } from "@/app/lib/sla";
import Avatar from "@/app/components/Avatar";
import FilterDropdown from "@/app/components/FilterDropdown";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import AssigneeLookup, { type AssigneeOption } from "./tickets/[ticketNumber]/AssigneeLookup";

const BULK_STATUSES = ["Open", "In Progress", "Closed"] as const;
const BULK_CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const STATUS_STYLES: Record<string, string> = {
  Open: "border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]",
  "In Progress": "border-amber-border bg-amber-bg text-amber-text-strong",
  Closed: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

const PRIORITY_BAR: Record<string, string> = {
  High: "border-l-[color:var(--color-rose)]",
  Normal: "border-l-[color:var(--color-blue)]/40",
  Low: "border-l-[color:var(--color-emerald)]/40",
};

type SortKey =
  | "ticket_number"
  | "subject"
  | "name"
  | "category"
  | "team"
  | "assigned_to"
  | "status"
  | "created_at"
  | "priority";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "ticket_number", label: "Ticket #" },
  { key: "subject", label: "Subject" },
  { key: "name", label: "Requester" },
  { key: "category", label: "Category" },
  { key: "team", label: "Team" },
  { key: "assigned_to", label: "Assigned" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Submitted" },
  { key: "priority", label: "Priority" },
];

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

type TicketWithLabel = TicketRow & { submittedLabel: string };

export default function TicketsTable({
  tickets,
  slaHours,
  canManage,
  assigneeOptions,
}: {
  tickets: TicketWithLabel[];
  slaHours: SlaHours;
  canManage: boolean;
  assigneeOptions: AssigneeOption[];
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [pendingAction, setPendingAction] = useState<
    { type: "status"; status: string } | { type: "assign"; assignedTo: string } | null
  >(null);
  const [applying, setApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState<
    | null
    | { kind: "success"; updated: number }
    | { kind: "partial"; updated: number; notFoundCount: number }
    | { kind: "error" }
  >(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });
  const [page, setPage] = useState(1);

  const statuses = useMemo(() => uniqueSorted(tickets.map((t) => t.status)), [tickets]);
  const priorities = useMemo(() => uniqueSorted(tickets.map((t) => t.priority)), [tickets]);
  const teams = useMemo(() => uniqueSorted(tickets.map((t) => t.team)), [tickets]);
  const categories = useMemo(() => uniqueSorted(tickets.map((t) => t.category)), [tickets]);
  const assignees = useMemo(
    () => uniqueSorted(tickets.map((t) => t.assigned_to || UNASSIGNED)),
    [tickets]
  );

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (teamFilter !== "All" && t.team !== teamFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (assigneeFilter !== "All" && (t.assigned_to || UNASSIGNED) !== assigneeFilter) return false;
      if (!q) return true;
      return SEARCH_FIELDS.some((field) => String(t[field] ?? "").toLowerCase().includes(q));
    });
  }, [tickets, search, statusFilter, priorityFilter, teamFilter, categoryFilter, assigneeFilter]);

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

  const filterSignature = `${search}|${statusFilter}|${priorityFilter}|${teamFilter}|${categoryFilter}|${assigneeFilter}|${sort.key}|${sort.direction}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPage(1);
    setSelected(new Set());
    setSelectAllMatching(false);
    setBulkResult(null);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

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
      router.refresh();
    } catch {
      setBulkResult({ kind: "error" });
    } finally {
      setApplying(false);
      setTimeout(() => setBulkResult(null), 4000);
    }
  }

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
            placeholder="Search tickets by any field…"
            className="w-full rounded-full border border-card-border bg-paper py-[8.25px] pl-[32px] pr-[12px] text-[10.5px] text-ink outline-none focus:border-[color:var(--color-blue)]"
          />
        </div>
        <span className="inline-flex items-center gap-[4.5px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
          <SlidersHorizontal size={12} strokeWidth={2.25} />
          Filters
        </span>
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses} />
        <FilterDropdown label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorities} />
        <FilterDropdown label="Team" value={teamFilter} onChange={setTeamFilter} options={teams} />
        <FilterDropdown label="Category" value={categoryFilter} onChange={setCategoryFilter} options={categories} />
        <FilterDropdown label="Assigned" value={assigneeFilter} onChange={setAssigneeFilter} options={assignees} />
      </div>

      {canManage && selectionCount > 0 && (
        <div className="flex flex-wrap items-center gap-[9px] rounded-[12px] border border-card-border bg-white px-[13.5px] py-[10.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <span className="text-[9.75px] font-semibold text-ink">
            {selectionCount} selected
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-[3px] text-[9px] font-semibold text-muted hover:text-primary"
          >
            <X size={10} strokeWidth={2.5} />
            Clear selection
          </button>
          <span className="mx-[3px] h-[15px] w-px bg-divider" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-2">Set status</span>
          {BULK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={applying}
              onClick={() => setPendingAction({ type: "status", status: s })}
              className="rounded-full border border-card-border bg-paper px-[10.5px] py-[5.25px] text-[9.75px] font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {s}
            </button>
          ))}
          <span className="mx-[3px] h-[15px] w-px bg-divider" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-2">Assign to</span>
          <div className="flex min-w-[180px] items-center gap-[6px]">
            <AssigneeLookup value={bulkAssignee} onChange={setBulkAssignee} options={assigneeOptions} disabled={applying} />
            <button
              type="button"
              disabled={applying}
              onClick={() => setPendingAction({ type: "assign", assignedTo: bulkAssignee })}
              className="inline-flex shrink-0 items-center gap-[4.5px] whitespace-nowrap rounded-[7.5px] bg-ink px-[10.5px] py-[6px] text-[9.75px] font-semibold text-paper transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={11} strokeWidth={2.5} />
              Apply
            </button>
          </div>
          {applying && (
            <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-muted-2">
              <Loader2 size={10.5} strokeWidth={2.5} className="animate-spin" />
              Applying…
            </span>
          )}
        </div>
      )}

      {canManage && showSelectAllBanner && (
        <div className="flex flex-wrap items-center gap-[6px] rounded-[10px] border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] px-[13.5px] py-[9px] text-[9.75px] text-[color:var(--color-blue-text)]">
          <span>
            All {paginated.length} tickets on this page are selected.
          </span>
          <button
            type="button"
            onClick={() => setSelectAllMatching(true)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Select all {sorted.length} tickets matching your filters
          </button>
        </div>
      )}

      {bulkResult && (
        <div
          className={`inline-flex w-fit items-center gap-[6px] rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold ${
            bulkResult.kind === "success"
              ? "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]"
              : bulkResult.kind === "partial"
              ? "border-amber-border bg-amber-bg text-amber-text-strong"
              : "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]"
          }`}
        >
          {bulkResult.kind === "error" ? (
            <AlertCircle size={11} strokeWidth={2.5} />
          ) : (
            <Check size={11} strokeWidth={2.5} />
          )}
          {bulkResult.kind === "success" && `Updated ${bulkResult.updated} ticket${bulkResult.updated === 1 ? "" : "s"}`}
          {bulkResult.kind === "partial" &&
            `Updated ${bulkResult.updated} ticket${bulkResult.updated === 1 ? "" : "s"} — ${bulkResult.notFoundCount} no longer exist${bulkResult.notFoundCount === 1 ? "s" : ""}`}
          {bulkResult.kind === "error" && "Failed to update tickets"}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        loading={applying}
        title={
          pendingAction?.type === "status"
            ? `Set ${selectionCount} ticket${selectionCount === 1 ? "" : "s"} to "${pendingAction.status}"?`
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

      <span className="text-[9px] text-faint">
        Showing {rangeStart}–{rangeEnd} of {sorted.length} tickets
      </span>

      <div className="overflow-x-auto rounded-[12px] border border-card-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[900px] border-collapse text-left text-[10.5px]">
          <thead>
            <tr className="border-b border-card-border bg-result-bg/50 text-[9px] uppercase tracking-[0.06em] text-muted-2">
              {canManage && (
                <th className="px-[15px] py-[10.5px]">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={headerChecked}
                    onChange={toggleSelectPage}
                    className="h-[12px] w-[12px] accent-primary"
                    aria-label="Select all tickets on this page"
                  />
                </th>
              )}
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
            {paginated.map((t, i) => (
              <tr
                key={t.id}
                className={`border-b border-divider transition-colors last:border-b-0 hover:bg-result-bg/40 ${
                  i % 2 === 1 ? "bg-result-bg/20" : ""
                }`}
              >
                {canManage && (
                  <td className="px-[15px] py-[12px]">
                    <input
                      type="checkbox"
                      checked={selectAllMatching || selected.has(t.ticket_number)}
                      onChange={() => toggleSelectRow(t.ticket_number)}
                      className="h-[12px] w-[12px] accent-primary"
                      aria-label={`Select ticket ${t.ticket_number}`}
                    />
                  </td>
                )}
                <td
                  className={`whitespace-nowrap border-l-[3px] px-[15px] py-[12px] font-mono-plex ${
                    PRIORITY_BAR[t.priority] ?? PRIORITY_BAR.Normal
                  }`}
                >
                  <Link
                    href={`/admin/tickets/${t.ticket_number}`}
                    className="inline-flex items-center gap-[4.5px] rounded-full border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] px-[9px] py-[4.5px] text-[9.75px] font-semibold text-[color:var(--color-blue-text)] transition-colors hover:bg-[color:var(--color-blue)] hover:text-paper"
                  >
                    {t.ticket_number}
                  </Link>
                </td>
                <td className="px-[15px] py-[12px]">
                  <span className="font-medium text-ink">{t.subject}</span>
                </td>
                <td className="px-[15px] py-[12px] text-muted">
                  <div className="flex items-center gap-[9px]">
                    <Avatar name={t.name} />
                    <div className="flex flex-col gap-[1.5px]">
                      <span className="text-ink">{t.name}</span>
                      <span className="text-[9px] text-faint">
                        {t.staff_no} · {t.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-[15px] py-[12px] text-muted">{t.category}</td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  <span className="rounded-full border border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] px-[8.25px] py-[3.75px] text-[9px] font-semibold text-[color:var(--color-violet-text)]">
                    {t.team}
                  </span>
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  {t.assigned_to ? (
                    <span className="rounded-full border border-pill-border bg-pill-bg px-[8.25px] py-[3.75px] text-[9px] font-semibold text-pill-text">
                      {t.assigned_to}
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-card-border px-[8.25px] py-[3.75px] text-[9px] font-medium text-faint">
                      {UNASSIGNED}
                    </span>
                  )}
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
                  <div className="flex items-center gap-[6px]">
                    {t.submittedLabel}
                    {isOverdue(t, slaHours) && (
                      <span
                        title="Past SLA target for its priority"
                        className="inline-flex items-center gap-[3px] rounded-full border border-amber-border bg-amber-bg px-[6px] py-[1.5px] text-[8px] font-semibold uppercase tracking-[0.04em] text-amber-text-strong"
                      >
                        <TimerReset size={9} strokeWidth={2.5} />
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  <span
                    className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                      PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.Normal
                    }`}
                  >
                    {t.priority}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + (canManage ? 1 : 0)}
                  className="px-[15px] py-[24px] text-center text-[10.5px] text-faint"
                >
                  No tickets match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-[9px]">
          <span className="text-[9px] text-faint">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-[4.5px]">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-[27px] w-[27px] items-center justify-center rounded-[7.5px] border border-card-border bg-white text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={13} strokeWidth={2.25} />
            </button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${i}`} className="px-[4.5px] text-[9.75px] text-faint">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-[27px] w-[27px] items-center justify-center rounded-[7.5px] border text-[9.75px] font-semibold transition-colors ${
                    p === currentPage
                      ? "border-primary bg-primary text-paper"
                      : "border-card-border bg-white text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-[27px] w-[27px] items-center justify-center rounded-[7.5px] border border-card-border bg-white text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={13} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
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
