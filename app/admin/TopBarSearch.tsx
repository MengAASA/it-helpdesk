"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CornerDownLeft, Loader2, Search } from "lucide-react";
import { StatusDot } from "@/app/components/TicketBadges";
import type { SearchSuggestions } from "@/app/api/admin/search/route";
import { buildSections, type SidebarAccess } from "./AdminSidebar";
import { teamShort } from "./teamStyle";

type Item =
  | { kind: "ticket"; key: string; href: string; ticket: SearchSuggestions["tickets"][number] }
  | { kind: "filter"; key: string; href: string; filter: SearchSuggestions["filters"][number] }
  | { kind: "page"; key: string; href: string; label: string; section: string }
  | { kind: "all"; key: string; href: string };

const FILTER_LABEL: Record<SearchSuggestions["filters"][number]["kind"], string> = {
  assignee: "Assigned to",
  category: "Category",
  team: "Team",
  status: "Status",
};

const DEBOUNCE_MS = 160;
const EMPTY: SearchSuggestions = { tickets: [], filters: [] };

/** Wraps the part of `text` that matches `q` so it stands out. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-primary-soft px-[1px] font-semibold text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** "TCK-SVZS-R4BA" with the part someone typed without dashes ("svzs") picked out. */
function HighlightId({ id, q }: { id: string; q: string }) {
  const compact = q.replace(/[\s-]/g, "").toLowerCase();
  const plain = id.toLowerCase().replace(/-/g, "");
  const start = compact.length >= 3 ? plain.indexOf(compact) : -1;
  if (start < 0) return <Highlight text={id} q={q} />;
  // Map positions in the dash-less ID back onto the real one.
  const map: number[] = [];
  for (let i = 0; i < id.length; i++) if (id[i] !== "-") map.push(i);
  const from = map[start];
  const to = map[start + compact.length - 1] + 1;
  return (
    <>
      {id.slice(0, from)}
      <mark className="rounded-[3px] bg-primary-soft px-[1px] font-semibold text-ink">{id.slice(from, to)}</mark>
      {id.slice(to)}
    </>
  );
}

function filterHref(f: SearchSuggestions["filters"][number]): string {
  return `/admin/tickets?${f.kind}=${encodeURIComponent(f.value)}`;
}

/**
 * The top bar search. Typing shows suggestions: matching tickets, quick filters for the tickets
 * list and admin pages. Enter on nothing selected still searches the whole tickets list.
 */
export default function TopBarSearch({ access, userName }: { access: SidebarAccess; userName: string }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<{ q: string; data: SearchSuggestions }>({ q: "", data: EMPTY });
  const [loading, setLoading] = useState(false);

  const q = query.trim();

  // "/" jumps to the search from anywhere, unless the person is already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Fetch suggestions shortly after typing stops; a newer keystroke cancels the older request.
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${basePath}/api/admin/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = res.ok ? ((await res.json()) as SearchSuggestions) : EMPTY;
        setResults({ q, data });
      } catch {
        // Aborted by a newer keystroke, or offline: keep what's shown.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, basePath]);

  const pages = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return buildSections(access, userName)
      .flatMap((s) => s.items.map((i) => ({ ...i, section: s.label })))
      .filter((i) => i.label.toLowerCase().includes(lower))
      .slice(0, 3);
  }, [q, access, userName]);

  // Only show ticket results for what's currently typed, never stale ones from an older query.
  const data = q.length >= 2 && results.q === q ? results.data : EMPTY;

  const groups = useMemo(() => {
    const ticketItems: Item[] = data.tickets.map((t) => ({
      kind: "ticket",
      key: `t-${t.ticketNumber}`,
      href: `/admin/tickets/${encodeURIComponent(t.ticketNumber)}`,
      ticket: t,
    }));
    const filterItems: Item[] = data.filters.map((f) => ({ kind: "filter", key: `f-${f.kind}-${f.value}`, href: filterHref(f), filter: f }));
    const pageItems: Item[] = pages.map((p) => ({ kind: "page", key: `p-${p.href}`, href: p.href, label: p.label, section: p.section }));
    const allItem: Item[] = q ? [{ kind: "all", key: "all", href: `/admin/tickets?q=${encodeURIComponent(q)}` }] : [];
    return [
      { label: "Tickets", items: ticketItems },
      { label: "Filter tickets", items: filterItems },
      { label: "Pages", items: pageItems },
      { label: "", items: allItem },
    ].filter((g) => g.items.length > 0);
  }, [data, pages, q]);

  const flat = groups.flatMap((g) => g.items);
  const showPanel = open && q.length > 0;
  const waiting = q.length >= 2 && (loading || results.q !== q);
  const noMatches = q.length >= 2 && !waiting && data.tickets.length === 0 && data.filters.length === 0 && pages.length === 0;

  function go(item: Item) {
    setOpen(false);
    setActive(-1);
    // A full search keeps its words in the box; picking a ticket, filter or page clears it.
    if (item.kind !== "all") setQuery("");
    inputRef.current?.blur();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length ? (i + 1) % flat.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i <= 0 ? flat.length - 1 : i - 1) : -1));
    } else if (e.key === "Escape") {
      if (showPanel) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      } else {
        inputRef.current?.blur();
      }
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const chosen = active >= 0 ? flat[active] : null;
    if (chosen) return go(chosen);
    setOpen(false);
    inputRef.current?.blur();
    router.push(q ? `/admin/tickets?q=${encodeURIComponent(q)}` : "/admin/tickets");
  }

  const activeId = active >= 0 && flat[active] ? `${listId}-${flat[active].key}` : undefined;
  let index = -1;

  return (
    <form role="search" onSubmit={onSubmit} className="relative hidden sm:block">
      <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search tickets"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        placeholder="Search tickets or IDs…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-[32px] w-[220px] rounded-[8px] border border-field-border bg-surface pl-[30px] pr-[30px] text-[13px] text-ink transition-[width,border-color,box-shadow] placeholder:text-faint hover:border-field-border-hover focus:w-[280px] lg:w-[260px] lg:focus:w-[320px] [&::-webkit-search-cancel-button]:hidden"
      />
      {waiting && showPanel ? (
        <Loader2 size={14} strokeWidth={2} className="absolute right-[10px] top-1/2 -translate-y-1/2 animate-spin text-faint" />
      ) : (
        <kbd className="pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2 rounded-[4px] border border-card-border bg-surface px-[5px] font-mono-plex text-[11px] leading-[16px] text-faint">
          /
        </kbd>
      )}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            // Keep focus in the input while clicking a suggestion.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute right-0 top-[40px] z-50 w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-card-border bg-surface shadow-pop"
          >
            <div id={listId} role="listbox" aria-label="Search suggestions" className="flex max-h-[min(460px,70vh)] flex-col overflow-y-auto p-[6px]">
              {q.length === 1 && pages.length === 0 && (
                <p className="px-[10px] py-[8px] text-[12px] text-muted-2">Keep typing to search tickets…</p>
              )}
              {waiting && data.tickets.length === 0 && data.filters.length === 0 && (
                <p className="px-[10px] py-[8px] text-[12px] text-muted-2">Searching…</p>
              )}
              {noMatches && <p className="px-[10px] py-[8px] text-[13px] text-muted-2">No tickets match &ldquo;{q}&rdquo;.</p>}

              {groups.map((g) => (
                <div key={g.label || "all"} role="group" aria-label={g.label || undefined} className={g.label ? "" : "mt-[4px] border-t border-card-border/60 pt-[4px]"}>
                  {g.label && <div className="px-[10px] pb-[4px] pt-[8px] text-[12px] font-medium text-muted-2">{g.label}</div>}
                  {g.items.map((item) => {
                    index += 1;
                    const i = index;
                    const isActive = i === active;
                    return (
                      <div
                        key={item.key}
                        id={`${listId}-${item.key}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item)}
                        className={`flex cursor-pointer items-center gap-[10px] rounded-[8px] px-[10px] text-[13px] transition-colors duration-100 ${
                          isActive ? "bg-surface-2" : ""
                        } ${item.kind === "ticket" ? "py-[7px]" : "h-[34px]"}`}
                      >
                        <SuggestionBody item={item} q={q} />
                        {isActive && <CornerDownLeft size={13} strokeWidth={1.75} className="ml-auto shrink-0 text-faint" aria-hidden="true" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function SuggestionBody({ item, q }: { item: Item; q: string }) {
  if (item.kind === "ticket") {
    const t = item.ticket;
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-ink">
          <Highlight text={t.subject} q={q} />
        </span>
        <span className="flex min-w-0 items-center gap-[6px] text-[12px] text-muted-2">
          <span className="shrink-0 tabular-nums">
            <HighlightId id={t.ticketNumber} q={q} />
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            <Highlight text={t.requester} q={q} />
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex shrink-0 items-center gap-[5px]">
            <StatusDot status={t.status} />
            {t.status}
          </span>
        </span>
      </div>
    );
  }
  if (item.kind === "filter") {
    const f = item.filter;
    return (
      <span className="flex min-w-0 flex-1 items-center gap-[8px]">
        <span className="shrink-0 text-muted-2">{FILTER_LABEL[f.kind]}</span>
        <span className="truncate text-ink">
          <Highlight text={f.kind === "team" ? teamShort(f.value) : f.value} q={q} />
        </span>
        <span className="shrink-0 text-[12px] tabular-nums text-faint">
          {f.count} {f.count === 1 ? "ticket" : "tickets"}
        </span>
      </span>
    );
  }
  if (item.kind === "page") {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-[8px]">
        <span className="truncate text-ink">
          <Highlight text={item.label} q={q} />
        </span>
        <span className="shrink-0 text-[12px] text-faint">{item.section}</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[8px] text-muted">
      <ArrowRight size={14} strokeWidth={1.75} className="shrink-0 text-faint" />
      <span className="truncate">
        Search all tickets for <span className="font-medium text-ink">&ldquo;{q}&rdquo;</span>
      </span>
    </span>
  );
}
