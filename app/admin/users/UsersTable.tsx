"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import Avatar from "@/app/components/Avatar";
import FilterDropdown from "@/app/components/FilterDropdown";
import type { IamsUser } from "@/app/lib/iamsUsers";
import { COL_SEP, Pagination, SortHeader, type ListSort } from "../listParts";
import { TEAM_DOT, UNASSIGNED } from "../teamStyle";

export type UserRow = IamsUser & {
  team: string | null;
  /** "10 Sep 2026", formatted on the server. */
  registered: string;
};

type SortKey = "name" | "staffId" | "role" | "status" | "team" | "createdAt";

const PAGE_SIZE = 50;

const STATUS_DOT: Record<string, string> = {
  approved: "bg-emerald",
  pending: "bg-amber-solid",
  rejected: "bg-rose",
};

/**
 * Column slots shared by the header and every row. Secondary columns appear only once the list
 * is wide enough (container queries), so there is never a horizontal scrollbar; below that,
 * staff ID and team fold under the person's name.
 */
const COL = {
  staffId: `hidden w-[132px] shrink-0 @min-[640px]:flex ${COL_SEP}`,
  role: `hidden w-[104px] shrink-0 @min-[520px]:flex ${COL_SEP}`,
  status: `hidden w-[128px] shrink-0 @min-[760px]:flex ${COL_SEP}`,
  team: `hidden w-[176px] shrink-0 @min-[900px]:flex ${COL_SEP}`,
  registered: `hidden w-[128px] shrink-0 @min-[1040px]:flex ${COL_SEP}`,
} as const;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function sortValue(u: UserRow, key: Exclude<SortKey, "createdAt">): string {
  if (key === "staffId") return u.staffId ?? "";
  if (key === "team") return u.team ?? UNASSIGNED;
  return String(u[key] ?? "");
}

export default function UsersTable({ users }: { users: UserRow[] }) {
  const [search, setSearchRaw] = useState("");
  const [roleFilter, setRoleFilterRaw] = useState("All");
  const [statusFilter, setStatusFilterRaw] = useState("All");
  const [teamFilter, setTeamFilterRaw] = useState("All");
  const [sort, setSort] = useState<ListSort<SortKey>>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const roles = useMemo(() => uniqueSorted(users.map((u) => u.role)), [users]);
  const statuses = useMemo(() => uniqueSorted(users.map((u) => u.status)), [users]);
  const teams = useMemo(() => uniqueSorted(users.map((u) => u.team ?? UNASSIGNED)), [users]);

  // Any change to what is shown starts again from the first page.
  const resetting =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const setSearch = resetting(setSearchRaw);
  const setRoleFilter = resetting(setRoleFilterRaw);
  const setStatusFilter = resetting(setStatusFilterRaw);
  const setTeamFilter = resetting(setTeamFilterRaw);

  const hasFilters = search.trim() !== "" || roleFilter !== "All" || statusFilter !== "All" || teamFilter !== "All";

  function clearFilters() {
    setSearchRaw("");
    setRoleFilterRaw("All");
    setStatusFilterRaw("All");
    setTeamFilterRaw("All");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "createdAt" ? "desc" : "asc" },
    );
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "All" && u.role !== roleFilter) return false;
      if (statusFilter !== "All" && u.status !== statusFilter) return false;
      if (teamFilter !== "All" && (u.team ?? UNASSIGNED) !== teamFilter) return false;
      if (!q) return true;
      return [u.name, u.email, u.staffId ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [users, search, roleFilter, statusFilter, teamFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const diff =
        sort.key === "createdAt"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : sortValue(a, sort.key).localeCompare(sortValue(b, sort.key));
      return sort.direction === "asc" ? diff : -diff;
    });
    return rows;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <div className="relative w-full sm:w-[260px]">
          <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, staff ID…"
            aria-label="Search users"
            className="h-[30px] w-full rounded-[8px] border border-field-border bg-surface pl-[30px] pr-[10px] text-[13px] text-ink outline-none transition-colors placeholder:text-faint hover:border-field-border-hover"
          />
        </div>
        <FilterDropdown label="Role" value={roleFilter} onChange={setRoleFilter} options={roles} />
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses} />
        <FilterDropdown label="Team" value={teamFilter} onChange={setTeamFilter} options={teams} />
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

      <section aria-label="Users" className="@container rounded-[16px] border border-card-border/50 bg-surface px-[6px] pb-[6px]">
        <div className="flex h-[40px] items-stretch gap-[12px] border-b border-card-border px-[10px] text-[12px] font-medium text-muted-2">
          <SortHeader label="Name" sortKey="name" sort={sort} onSort={toggleSort} className="flex min-w-0 flex-1" />
          <SortHeader label="Staff ID" sortKey="staffId" sort={sort} onSort={toggleSort} className={COL.staffId} />
          <SortHeader label="Role" sortKey="role" sort={sort} onSort={toggleSort} className={COL.role} />
          <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} className={COL.status} />
          <SortHeader label="Team" sortKey="team" sort={sort} onSort={toggleSort} className={COL.team} />
          <SortHeader label="Registered" sortKey="createdAt" sort={sort} onSort={toggleSort} className={COL.registered} />
          {/* Keeps the header in line with the rows' trailing chevron. */}
          <span className="w-[16px] shrink-0" aria-hidden="true" />
        </div>

        {pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-[4px] px-[16px] py-[48px] text-center">
            <p className="text-[13px] font-medium text-ink">{hasFilters ? "Nothing matches" : "No users yet"}</p>
            <p className="text-[12px] text-muted-2">
              {hasFilters ? "Try another search, or loosen a filter." : "People appear here once they register in IAMS."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-[10px] h-[28px] rounded-[7px] border border-field-border px-[10px] text-[12px] text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col pt-[4px]">
            {pageRows.map((u) => (
              <UserRowItem key={u.id} user={u} />
            ))}
          </ul>
        )}
      </section>

      <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-[8px]">
        <span className="text-[12px] tabular-nums text-muted-2">
          {sorted.length === 0
            ? "No users"
            : `Showing ${rangeStart}–${rangeEnd} of ${sorted.length.toLocaleString()} user${sorted.length === 1 ? "" : "s"}`}
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}

function UserRowItem({ user: u }: { user: UserRow }) {
  // People without a staff ID have no helpdesk permissions to open, so their row is not a link.
  const linked = Boolean(u.staffId);
  return (
    <li
      className={`group/row relative flex min-h-[52px] items-stretch gap-[12px] rounded-[10px] px-[10px] text-[13px] transition-colors duration-150 *:py-[8px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring ${
        linked ? "hover:bg-surface-2/50" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[10px]">
        <Avatar name={u.name} size={28} />
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-[8px]">
            {linked ? (
              // The link's ::after stretches over the whole row, so the row is one big click target.
              <Link
                href={`/admin/users/${u.staffId}`}
                className="truncate font-medium leading-[20px] text-ink outline-none after:absolute after:inset-0 after:rounded-[10px] after:content-['']"
              >
                {u.name}
              </Link>
            ) : (
              <span className="truncate font-medium leading-[20px] text-ink">{u.name}</span>
            )}
            {/* Without the role column, admins are marked beside their name. */}
            {u.role === "admin" && (
              <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-primary-soft px-[7px] text-[11px] font-medium text-primary @min-[520px]:hidden">
                Admin
              </span>
            )}
          </span>
          <span className="truncate text-[12px] leading-[18px] text-muted-2" title={u.email}>
            {u.email}
            {/* Narrow lists fold the hidden columns in here. */}
            <span className="@min-[640px]:hidden">{u.staffId ? ` · ${u.staffId}` : ""}</span>
            <span className="@min-[900px]:hidden"> · {u.team ?? UNASSIGNED}</span>
          </span>
        </div>
      </div>

      <span className={`${COL.staffId} items-center font-mono-plex text-[12px] text-muted`}>
        {u.staffId ?? <span className="text-faint">No staff ID</span>}
      </span>

      <span className={`${COL.role} items-center`}>
        {u.role === "admin" ? (
          <span className="inline-flex h-[22px] items-center rounded-full bg-primary-soft px-[9px] text-[12px] font-medium text-primary">
            Admin
          </span>
        ) : (
          <span className="capitalize text-muted">{u.role}</span>
        )}
      </span>

      <span className={`${COL.status} items-center gap-[8px] capitalize text-ink`}>
        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_DOT[u.status] ?? "bg-faint"}`} aria-hidden="true" />
        {u.status}
      </span>

      <span className={`${COL.team} min-w-0 items-center gap-[8px]`}>
        {u.team ? (
          <>
            <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${TEAM_DOT[u.team] ?? "bg-faint"}`} aria-hidden="true" />
            <span className="truncate text-ink">{u.team}</span>
          </>
        ) : (
          <>
            <span className="h-[7px] w-[7px] shrink-0 rounded-full border border-dashed border-faint" aria-hidden="true" />
            <span className="text-faint">{UNASSIGNED}</span>
          </>
        )}
      </span>

      <span className={`${COL.registered} items-center whitespace-nowrap tabular-nums text-muted`}>{u.registered}</span>

      <span className="flex w-[16px] shrink-0 items-center justify-end">
        {linked && (
          <ChevronRight
            size={14}
            strokeWidth={1.75}
            className="text-faint opacity-0 transition-[opacity,transform] duration-150 group-hover/row:translate-x-[2px] group-hover/row:opacity-100"
          />
        )}
      </span>
    </li>
  );
}
