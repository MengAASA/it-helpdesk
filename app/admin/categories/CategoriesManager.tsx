"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import { TEAMS } from "@/app/lib/teams";
import type { Category } from "@/app/lib/categories";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { COL_SEP, SortHeader, type ListSort } from "../listParts";
import { TEAM_COLOR, TEAM_DOT, teamShort } from "../teamStyle";

/** What the tickets table says about one category. */
export type CategoryUsage = {
  tickets: number;
  /** Tickets not yet closed. */
  open: number;
  /** dd/mm/yyyy of the newest ticket, formatted on the server. */
  lastTicket: string | null;
  /** The same moment as a timestamp, for sorting. */
  lastTicketAt: number;
};

type SortKey = "name" | "team" | "tickets" | "open" | "last";

const NO_USAGE: CategoryUsage = { tickets: 0, open: 0, lastTicket: null, lastTicketAt: 0 };
const EASE = [0.22, 1, 0.36, 1] as const;
const ALL = "All";

/**
 * Column slots shared by the header and every row, like the users and tickets lists. Secondary
 * columns appear only once the table is wide enough, so it never scrolls sideways.
 */
const COL = {
  team: `hidden w-[132px] shrink-0 @min-[560px]:flex ${COL_SEP}`,
  tickets: `flex w-[60px] shrink-0 @min-[480px]:w-[136px] ${COL_SEP}`,
  open: `hidden w-[68px] shrink-0 @min-[680px]:flex ${COL_SEP}`,
  last: `hidden w-[108px] shrink-0 @min-[800px]:flex ${COL_SEP}`,
  action: "flex w-[28px] shrink-0 items-center justify-end",
} as const;

/** "Admin - Network" → ["Admin", "Network"]; names without a prefix come back as [null, name]. */
function splitName(name: string): [string | null, string] {
  const i = name.indexOf(" - ");
  return i > 0 ? [name.slice(0, i), name.slice(i + 3)] : [null, name];
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function CategoriesManager({
  initialCategories,
  usage,
}: {
  initialCategories: Category[];
  /** Per category name, from the tickets table. */
  usage: Record<string, CategoryUsage>;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [categories, setCategories] = useState(initialCategories);
  const [teamFilter, setTeamFilter] = useState<string>(ALL);
  const [sort, setSort] = useState<ListSort<SortKey>>({ key: "team", direction: "asc" });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [newTeam, setNewTeam] = useState<string>(TEAMS[0]);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usageOf = (c: Category) => usage[c.name] ?? NO_USAGE;
  const teams = useMemo(
    () => [...TEAMS, ...Array.from(new Set(categories.map((c) => c.team))).filter((t) => !(TEAMS as readonly string[]).includes(t))],
    [categories],
  );
  // Bars compare against the busiest category overall, so they mean the same thing under any filter.
  const maxTickets = Math.max(1, ...categories.map((c) => usageOf(c).tickets));

  const rows = useMemo(() => {
    const get = (c: Category) => usage[c.name] ?? NO_USAGE;
    const dir = sort.direction === "asc" ? 1 : -1;
    const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
    const value: Record<SortKey, (a: Category, b: Category) => number> = {
      name: byName,
      team: (a, b) => a.team.localeCompare(b.team),
      tickets: (a, b) => get(a).tickets - get(b).tickets,
      open: (a, b) => get(a).open - get(b).open,
      last: (a, b) => get(a).lastTicketAt - get(b).lastTicketAt,
    };
    return categories
      .filter((c) => teamFilter === ALL || c.team === teamFilter)
      .sort((a, b) => value[sort.key](a, b) * dir || byName(a, b));
  }, [categories, teamFilter, sort, usage]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" || key === "team" ? "asc" : "desc" },
    );
  }

  function openAdd() {
    setAdding(true);
    setName("");
    setAddError(null);
    setNewTeam(teamFilter === ALL ? TEAMS[0] : teamFilter);
  }

  function closeAdd() {
    setAdding(false);
    setName("");
    setAddError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), team: newTeam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add category");
      setCategories((prev) => [...prev, data as Category]);
      closeAdd();
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/categories/${pendingDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete category");
      setCategories((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError((err as Error).message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const pendingCount = pendingDelete ? usageOf(pendingDelete).tickets : 0;
  const filterOptions = [ALL, ...teams];

  return (
    <div className="flex flex-col gap-[16px]">
      {error && (
        <div role="alert" className="flex items-center gap-[8px] rounded-[10px] bg-rose-light px-[12px] py-[8px] text-[13px] text-rose-text">
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {error}
        </div>
      )}

      <Summary categories={categories} usage={usage} teamCount={teams.length} />

      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-center justify-between gap-[8px]">
          <div
            role="radiogroup"
            aria-label="Show team"
            className="inline-flex h-[32px] max-w-full items-center overflow-x-auto rounded-[9px] border border-field-border bg-surface-2 p-[2px] [scrollbar-width:none]"
          >
            {filterOptions.map((t) => {
              const active = teamFilter === t;
              const count = t === ALL ? categories.length : categories.filter((c) => c.team === t).length;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTeamFilter(t)}
                  className={`relative flex h-[26px] shrink-0 items-center whitespace-nowrap rounded-[7px] px-[10px] text-[13px] transition-colors ${
                    active ? "text-ink" : "text-muted-2 hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="category-team-filter"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-[7px] bg-surface shadow-card"
                    />
                  )}
                  <span className="relative flex items-center gap-[6px]">
                    {t !== ALL && <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[t] ?? "bg-faint"}`} aria-hidden="true" />}
                    {t === ALL ? "All" : teamShort(t)}
                    <span className={`text-[12px] tabular-nums ${active ? "text-muted-2" : "text-faint"}`}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={openAdd}
            disabled={adding}
            className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <Plus size={14} strokeWidth={2} />
            Add category
          </button>
        </div>

        <section aria-label="Categories" className="@container rounded-[16px] border border-card-border/50 bg-surface px-[6px] pb-[6px]">
          <div className="flex h-[40px] items-stretch gap-[12px] border-b border-card-border px-[10px] text-[12px] font-medium text-muted-2">
            <SortHeader label="Category" sortKey="name" sort={sort} onSort={toggleSort} className="flex min-w-0 flex-1" />
            <SortHeader label="Team" sortKey="team" sort={sort} onSort={toggleSort} className={COL.team} />
            <SortHeader label="Tickets" sortKey="tickets" sort={sort} onSort={toggleSort} className={COL.tickets} />
            <SortHeader label="Open" sortKey="open" sort={sort} onSort={toggleSort} className={COL.open} />
            <SortHeader label="Last ticket" sortKey="last" sort={sort} onSort={toggleSort} className={COL.last} />
            <span className={COL.action} aria-hidden="true" />
          </div>

          <AnimatePresence initial={false}>
            {adding && (
              <motion.form
                key="add"
                onSubmit={handleAdd}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-[6px] flex flex-col gap-[8px] rounded-[12px] bg-primary-soft/60 p-[8px]">
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && closeAdd()}
                      placeholder="Category name, e.g. Application - Mobile"
                      aria-label="New category name"
                      autoFocus
                      maxLength={255}
                      className="h-[32px] min-w-[200px] flex-1 rounded-[8px] border border-field-border bg-surface px-[10px] text-[13px] text-ink outline-none transition-colors placeholder:text-faint hover:border-field-border-hover"
                    />
                    <div role="radiogroup" aria-label="Team" className="flex items-center gap-[4px]">
                      {TEAMS.map((t) => {
                        const active = newTeam === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setNewTeam(t)}
                            className={`inline-flex h-[28px] items-center gap-[6px] rounded-full border px-[10px] text-[12px] transition-colors ${
                              active ? "border-ink bg-ink text-surface" : "border-card-border bg-surface text-muted hover:border-field-border-hover hover:text-ink"
                            }`}
                          >
                            <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[t]}`} aria-hidden="true" />
                            {teamShort(t)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="ml-auto flex items-center gap-[4px]">
                      <button
                        type="submit"
                        disabled={saving || !name.trim()}
                        className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                      >
                        {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={closeAdd}
                        aria-label="Cancel"
                        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-muted-2 transition-colors hover:bg-surface hover:text-ink"
                      >
                        <X size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  {addError && (
                    <p role="alert" className="flex items-center gap-[6px] px-[2px] text-[12px] text-rose-text">
                      <AlertCircle size={13} strokeWidth={2} />
                      {addError}
                    </p>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-[4px] px-[16px] py-[40px] text-center">
              <p className="text-[13px] font-medium text-ink">No categories here yet</p>
              <p className="text-[12px] text-muted-2">Add one and new tickets in it will go to {teamFilter === ALL ? "its team" : `the ${teamFilter}`}.</p>
            </div>
          ) : (
            <ul className="flex flex-col pt-[4px]">
              <AnimatePresence initial={false}>
                {rows.map((c) => {
                  const [prefix, rest] = splitName(c.name);
                  const u = usageOf(c);
                  return (
                    <motion.li
                      key={c.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 44 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="group/cat overflow-hidden"
                    >
                      <div className="flex h-[44px] items-stretch gap-[12px] rounded-[10px] px-[10px] text-[13px] transition-colors duration-150 hover:bg-surface-2/50">
                        <span className="flex min-w-0 flex-1 items-center gap-[8px]">
                          <span className={`h-[6px] w-[6px] shrink-0 rounded-full @min-[560px]:hidden ${TEAM_DOT[c.team] ?? "bg-faint"}`} aria-hidden="true" />
                          <span className="truncate" title={c.name}>
                            {prefix && <span className="text-muted-2">{prefix} · </span>}
                            <span className="font-medium text-ink">{rest}</span>
                          </span>
                        </span>

                        <span className={`${COL.team} items-center`}>
                          <span className="inline-flex h-[22px] items-center gap-[6px] rounded-full border border-card-border px-[8px] text-[12px] text-ink">
                            <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[c.team] ?? "bg-faint"}`} aria-hidden="true" />
                            {teamShort(c.team)}
                          </span>
                        </span>

                        <span className={`${COL.tickets} items-center gap-[10px]`}>
                          <span className={`w-[24px] shrink-0 tabular-nums ${u.tickets > 0 ? "text-ink" : "text-faint"}`}>{u.tickets}</span>
                          <span className="hidden h-[4px] flex-1 overflow-hidden rounded-full bg-surface-2 @min-[480px]:block" aria-hidden="true">
                            <span
                              className="grow-x block h-full rounded-full"
                              style={{
                                width: `${(u.tickets / maxTickets) * 100}%`,
                                minWidth: u.tickets > 0 ? 3 : 0,
                                background: TEAM_COLOR[c.team] ?? "var(--faint)",
                              }}
                            />
                          </span>
                        </span>

                        <span className={`${COL.open} items-center tabular-nums ${u.open > 0 ? "text-ink" : "text-faint"}`}>{u.open}</span>

                        <span className={`${COL.last} items-center tabular-nums ${u.lastTicket ? "text-muted" : "text-faint"}`}>
                          {u.lastTicket ?? "Never"}
                        </span>

                        <span className={COL.action}>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(c)}
                            aria-label={`Delete ${c.name}`}
                            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-faint opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-rose-light hover:text-rose-text focus-visible:opacity-100 group-hover/cat:opacity-100 [@media(hover:none)]:opacity-100"
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <p className="text-[12px] tabular-nums text-muted-2">
          {teamFilter === ALL ? plural(rows.length, "category", "categories") : `${rows.length} of ${plural(categories.length, "category", "categories")}`}
        </p>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this category?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will no longer be selectable when submitting new tickets.${
                pendingCount > 0
                  ? ` The ${plural(pendingCount, "ticket", "tickets")} already using it keep their category as-is.`
                  : " No tickets use it yet."
              }`
            : undefined
        }
        danger
        loading={deleting}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Dark summary band: how many categories, how many are in use, and which get the most tickets. */
function Summary({
  categories,
  usage,
  teamCount,
}: {
  categories: Category[];
  usage: Record<string, CategoryUsage>;
  teamCount: number;
}) {
  const counts = categories.map((c) => ({ c, n: usage[c.name]?.tickets ?? 0 }));
  const inUse = counts.filter((x) => x.n > 0).length;
  const top = [...counts].filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.c.name.localeCompare(b.c.name)).slice(0, 4);
  const max = Math.max(1, ...top.map((x) => x.n));
  // Tickets filed under a category that has since been deleted still count somewhere.
  const known = new Set(categories.map((c) => c.name));
  const orphaned = Object.entries(usage).reduce((n, [name, u]) => (known.has(name) ? n : n + u.tickets), 0);

  return (
    <section aria-label="Summary" className="tile-ink @container rounded-[16px] p-[20px]">
      <div className="flex flex-col gap-[20px] @min-[720px]:flex-row @min-[720px]:items-stretch">
        <div className="flex shrink-0 flex-col justify-between gap-[16px] @min-[720px]:w-[300px]">
          <div>
            <p className="text-[12px] text-muted-2">Categories</p>
            <div className="mt-[6px] flex items-end gap-[8px]">
              <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{categories.length}</span>
              <span className="pb-[5px] text-[13px] text-muted-2">
                across {teamCount} {teamCount === 1 ? "team" : "teams"}
              </span>
            </div>
          </div>
          <dl className="flex gap-[28px]">
            <div>
              <dt className="flex items-center gap-[6px] text-[12px] text-muted-2">
                <span className="h-[7px] w-[7px] rounded-full bg-lime-bright" aria-hidden="true" />
                In use
              </dt>
              <dd className="mt-[2px] text-[20px] font-semibold tabular-nums text-ink">{inUse}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-[6px] text-[12px] text-muted-2">
                <span className="h-[7px] w-[7px] rounded-full bg-white/30" aria-hidden="true" />
                No tickets yet
              </dt>
              <dd className="mt-[2px] text-[20px] font-semibold tabular-nums text-ink">{categories.length - inUse}</dd>
            </div>
          </dl>
        </div>

        <div className="h-px shrink-0 bg-white/10 @min-[720px]:h-auto @min-[720px]:w-px" aria-hidden="true" />

        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <div className="flex items-baseline justify-between gap-[12px]">
            <h2 className="text-[13px] font-semibold text-ink">Most used</h2>
            <span className="text-[12px] text-muted-2">by tickets filed</span>
          </div>
          {top.length === 0 ? (
            <p className="text-[13px] text-muted-2">No tickets have been filed yet.</p>
          ) : (
            <ul className="group/top flex flex-col gap-[10px]">
              {top.map(({ c, n }, i) => (
                <li key={c.id} className="transition-opacity duration-200 group-hover/top:opacity-40 hover:!opacity-100">
                  <div className="flex items-baseline justify-between gap-[12px] text-[13px]">
                    <span className="flex min-w-0 items-center gap-[8px]">
                      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${TEAM_DOT[c.team] ?? "bg-faint"}`} aria-hidden="true" />
                      <span className="truncate text-ink" title={c.name}>
                        {c.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">{n}</span>
                  </div>
                  <div className="mt-[6px] h-[4px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="grow-x h-full rounded-full"
                      style={{ width: `${(n / max) * 100}%`, background: TEAM_COLOR[c.team] ?? "var(--faint)", animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {orphaned > 0 && (
            <p className="text-[12px] text-muted-2">
              {orphaned} {orphaned === 1 ? "ticket uses a category" : "tickets use categories"} that no longer exist.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
