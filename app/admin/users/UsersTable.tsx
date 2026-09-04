"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import Avatar from "@/app/components/Avatar";
import FilterDropdown from "@/app/components/FilterDropdown";
import type { IamsUser } from "@/app/lib/iamsUsers";

const ROLE_STYLES: Record<string, string> = {
  admin: "border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] text-[color:var(--color-violet-text)]",
  user: "border-pill-border bg-pill-bg text-pill-text",
};

const STATUS_STYLES: Record<string, string> = {
  approved: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
  pending: "border-amber-border bg-amber-bg text-amber-text-strong",
  rejected: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
};

const TEAM_STYLES: Record<string, string> = {
  "Application team": "border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] text-[color:var(--color-violet-text)]",
  "System team": "border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] text-[color:var(--color-blue-text)]",
  "Admin team": "border-result-border bg-result-bg text-primary",
};

const UNASSIGNED = "Unassigned";

type UserWithTeam = IamsUser & { team: string | null };

type SortKey = "name" | "staffId" | "role" | "status" | "team" | "createdAt";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "staffId", label: "Staff ID" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "team", label: "Team" },
  { key: "createdAt", label: "Registered" },
];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function UsersTable({ users }: { users: UserWithTeam[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "createdAt",
    direction: "desc",
  });

  const roles = useMemo(() => uniqueSorted(users.map((u) => u.role)), [users]);
  const statuses = useMemo(() => uniqueSorted(users.map((u) => u.status)), [users]);
  const teams = useMemo(
    () => uniqueSorted(users.map((u) => u.team ?? UNASSIGNED)),
    [users]
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
      if (sort.key === "createdAt") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort.direction === "asc" ? diff : -diff;
      }
      const av = sort.key === "staffId" ? a.staffId ?? "" : String(a[sort.key] ?? "");
      const bv = sort.key === "staffId" ? b.staffId ?? "" : String(b[sort.key] ?? "");
      const diff = av.localeCompare(bv);
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
            placeholder="Search by name, email or staff ID…"
            className="w-full rounded-full border border-card-border bg-paper py-[8.25px] pl-[32px] pr-[12px] text-[10.5px] text-ink outline-none focus:border-[color:var(--color-blue)]"
          />
        </div>
        <FilterDropdown label="Role" value={roleFilter} onChange={setRoleFilter} options={roles} />
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses} />
        <FilterDropdown label="Team" value={teamFilter} onChange={setTeamFilter} options={teams} />
      </div>

      <span className="text-[9px] text-faint">
        Showing {sorted.length} of {users.length} users
      </span>

      <div className="overflow-x-auto rounded-[12px] border border-card-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[840px] border-collapse text-left text-[10.5px]">
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
            {sorted.map((u, i) => (
              <tr
                key={u.id}
                className={`border-b border-divider last:border-b-0 ${i % 2 === 1 ? "bg-result-bg/20" : ""}`}
              >
                <td className="px-[15px] py-[12px]">
                  {u.staffId ? (
                    <Link
                      href={`/admin/users/${u.staffId}`}
                      className="group flex items-center gap-[9px]"
                    >
                      <Avatar name={u.name} />
                      <div className="flex flex-col gap-[1.5px]">
                        <span className="font-semibold text-primary group-hover:underline">{u.name}</span>
                        <span className="text-[9px] text-faint">{u.email}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-[9px]">
                      <Avatar name={u.name} />
                      <div className="flex flex-col gap-[1.5px]">
                        <span className="text-ink">{u.name}</span>
                        <span className="text-[9px] text-faint">{u.email}</span>
                      </div>
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px] font-mono-plex text-muted">
                  {u.staffId ?? "—"}
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  <span
                    className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold capitalize ${
                      ROLE_STYLES[u.role] ?? ROLE_STYLES.user
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  <span
                    className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold capitalize ${
                      STATUS_STYLES[u.status] ?? STATUS_STYLES.pending
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px]">
                  {u.team ? (
                    <span
                      className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                        TEAM_STYLES[u.team] ?? "border-pill-border bg-pill-bg text-pill-text"
                      }`}
                    >
                      {u.team}
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-card-border px-[8.25px] py-[3.75px] text-[9px] font-medium text-faint">
                      {UNASSIGNED}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-[15px] py-[12px] text-[9px] text-faint">
                  {new Date(u.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-[15px] py-[24px] text-center text-[10.5px] text-faint">
                  No users match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
