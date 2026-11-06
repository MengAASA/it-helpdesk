"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Search, Sparkles, X } from "lucide-react";
import { teamFor, type Category } from "@/app/lib/categories";
import { TEAMS } from "@/app/lib/teams";
import { PriorityBadge } from "@/app/components/TicketBadges";
import { TEAM_DOT, teamShort } from "@/app/admin/teamStyle";
import HowToGuide from "./HowToGuide";
import StepIndicator from "./StepIndicator";
import TypingPlaceholder from "./TypingPlaceholder";

type ClassifyResult = {
  category: string;
  confidence: number;
  reason: string;
  team: string;
  priority: "Low" | "Normal" | "High";
  alternates: { name: string; score: number }[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Examples that type themselves into the empty description box, one after another. */
const TYPING_EXAMPLES = [
  "Baan shows an error when I release a purchase order",
  "The printer on level 2 keeps jamming halfway through a print",
  "I forgot my email password and now I'm locked out",
  "Excel freezes every time I open the monthly report",
];

/** Tap-to-fill starters for people who aren't sure how to put it. */
const EXAMPLES = [
  "My laptop can't connect to the office Wi-Fi",
  "Baan shows an error when I release a purchase order",
  "The printer on my floor won't print anything",
  "I need an email account for a new staff member",
];

export default function SubmitForm({ categories }: { categories: Category[] }) {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLElement>(null);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const classify = async (text: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Classification failed");
      setResult(data);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      // The technical reason is for IT, not the person filling in the form.
      console.warn("[submit] classification failed:", (e as Error).message);
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDescChange = (value: string) => {
    setDesc(value);
    setChosen(null);
    clearTimeout(debounceRef.current);
    if (value.trim().length >= 12) {
      setLoading(true);
      setError(null);
      debounceRef.current = setTimeout(() => classify(value), 600);
    } else {
      abortRef.current?.abort();
      setLoading(false);
      setResult(null);
      setError(null);
    }
  };

  const fillExample = (text: string) => {
    handleDescChange(text);
    textareaRef.current?.focus();
  };

  const top = chosen
    ? {
        category: chosen,
        team: teamFor(categories, chosen),
        reason: "You picked this category yourself.",
      }
    : result
      ? { category: result.category, team: result.team, reason: result.reason }
      : null;

  // A category picked by hand shows straight away, even if Boboi is still reading.
  const hasResult = !!top && (!!chosen || !loading);
  const words = desc.trim() ? desc.trim().split(/\s+/).length : 0;
  const tooShort = desc.trim().length < 12;
  const showPicker = browsing || (!!error && !chosen);

  const openPicker = () => {
    setBrowsing(true);
    requestAnimationFrame(() => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const pickCategory = (name: string) => {
    setChosen(name);
    setBrowsing(false);
  };

  const continueHref = top
    ? `/submit/ticket?${new URLSearchParams({
        category: top.category,
        team: top.team,
        priority: result?.priority ?? "Normal",
        description: desc,
      }).toString()}`
    : "#";

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[20px] px-[16px] pb-[56px] pt-[28px] md:px-[32px] md:pt-[40px]">
      <StepIndicator current={0} />

      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">What&apos;s going on?</h1>
        <p className="max-w-[520px] text-[13px] leading-[20px] text-muted-2">
          Describe it in your own words. Boboi works out the category, the team that should handle it, and how urgent it sounds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-[12px]">
          {/* The description box. */}
          <div className="rounded-[16px] border border-card-border/70 bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_12%,transparent)]">
            <div className="flex items-center justify-between gap-[12px] px-[16px] pt-[14px]">
              <label htmlFor="issue" className="text-[12px] font-medium text-muted">
                Describe the problem
              </label>
              <span className="text-[12px] tabular-nums text-faint" aria-live="polite">
                {tooShort ? (desc.trim() ? "Keep going…" : "") : `${words} words`}
              </span>
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                id="issue"
                rows={5}
                value={desc}
                onChange={(e) => handleDescChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                aria-describedby="issue-example"
                // While the animated examples play, the box has no placeholder of its own.
                placeholder={focused ? "Describe the problem in your own words…" : ""}
                className="field-bare block w-full resize-y border-0 bg-transparent px-[16px] pb-[12px] pt-[8px] text-[14px] leading-[22px] text-ink outline-none placeholder:text-faint"
              />
              <span id="issue-example" className="sr-only">
                For example: {TYPING_EXAMPLES[0]}
              </span>
              {!desc && !focused && (
                <TypingPlaceholder phrases={TYPING_EXAMPLES} className="absolute left-[16px] right-[16px] top-[8px] text-[14px] leading-[22px] text-faint" />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-[8px] border-t border-card-border/60 px-[12px] py-[10px]">
              <AnimatePresence mode="wait" initial={false}>
                {desc.trim() ? (
                  <motion.span
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-[4px] text-[12px] text-muted-2"
                  >
                    {tooShort ? "Write at least a sentence. More detail means better routing." : "Looks good. Add more detail any time."}
                  </motion.span>
                ) : (
                  <motion.div
                    key="examples"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-w-0 flex-wrap items-center gap-[6px]"
                  >
                    <span className="px-[4px] text-[12px] text-muted-2">Try</span>
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => fillExample(ex)}
                        className="h-[26px] max-w-full truncate rounded-full border border-card-border bg-surface px-[10px] text-[12px] text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                      >
                        {ex}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {!showPicker && (
                <button
                  type="button"
                  onClick={openPicker}
                  className="ml-auto h-[28px] rounded-[7px] px-[8px] text-[12px] font-medium text-primary transition-colors hover:bg-primary-soft"
                >
                  Pick the category myself
                </button>
              )}
            </div>
          </div>

          <BoboiPanel
            state={hasResult ? "result" : loading ? "thinking" : error && !chosen ? "error" : "idle"}
            top={top}
            result={chosen ? null : result}
            priority={result?.priority ?? "Normal"}
            continueHref={continueHref}
            onPickOther={openPicker}
            onPickAlternate={pickCategory}
          />

          <AnimatePresence initial={false}>
            {showPicker && (
              <motion.div
                key="picker"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <CategoryPicker
                  ref={pickerRef}
                  categories={categories}
                  selected={chosen}
                  onPick={pickCategory}
                  onClose={browsing ? () => setBrowsing(false) : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:sticky lg:top-[76px]">
          <HowToGuide />
        </div>
      </div>
    </main>
  );
}

/** Boboi's answer, in a dark card: waiting, reading, a suggestion, or "couldn't decide". */
function BoboiPanel({
  state,
  top,
  result,
  priority,
  continueHref,
  onPickOther,
  onPickAlternate,
}: {
  state: "idle" | "thinking" | "result" | "error";
  top: { category: string; team: string; reason: string } | null;
  /** Boboi's own result; null when the person picked the category by hand. */
  result: ClassifyResult | null;
  /** The priority that goes with the ticket: Boboi's, kept even when the category is picked by hand. */
  priority: string;
  continueHref: string;
  onPickOther: () => void;
  onPickAlternate: (name: string) => void;
}) {
  return (
    <section aria-label="Boboi's suggestion" aria-live="polite" className="tile-ink overflow-hidden rounded-[16px] p-[16px]">
      <div className="flex items-center gap-[8px] text-[12px] text-muted-2">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white/10 text-primary-light">
          <Sparkles size={12} strokeWidth={2} />
        </span>
        <span className="font-medium text-ink">Boboi</span>
        <span>
          {state === "thinking"
            ? "is reading your description"
            : state === "result"
              ? result
                ? "suggests"
                : "· your pick"
              : state === "error"
                ? "needs a hand"
                : "is listening"}
        </span>
        {state === "thinking" && <ThinkingDots />}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {state === "idle" && (
          <motion.p key="idle" {...fade} className="mt-[10px] text-[13px] leading-[20px] text-muted">
            Start typing and I&apos;ll suggest a category, the team that should handle it, and how urgent it sounds.
          </motion.p>
        )}

        {state === "thinking" && (
          <motion.div key="thinking" {...fade} className="mt-[12px] flex flex-col gap-[8px]" aria-hidden="true">
            <span className="h-[18px] w-[46%] animate-pulse rounded-[6px] bg-white/10" />
            <span className="h-[12px] w-[78%] animate-pulse rounded-[6px] bg-white/[0.07]" />
            <span className="h-[12px] w-[60%] animate-pulse rounded-[6px] bg-white/[0.07]" />
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" {...fade} className="mt-[10px] flex flex-col gap-[4px]">
            <p className="text-[13px] leading-[20px] text-ink">I couldn&apos;t sort this one out automatically.</p>
            <p className="text-[13px] leading-[20px] text-muted">Pick the category from the list below. It only takes a second.</p>
          </motion.div>
        )}

        {state === "result" && top && (
          <motion.div key={`result-${top.category}`} {...fade} className="mt-[12px] flex flex-col gap-[14px]">
            <div className="flex flex-col gap-[4px]">
              <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-ink">{top.category}</h2>
              <p className="text-[13px] leading-[20px] text-muted">{top.reason}</p>
            </div>

            <div className="flex flex-wrap items-center gap-[6px]">
              <span className="inline-flex h-[24px] items-center gap-[6px] rounded-full bg-white/10 px-[9px] text-[12px] text-ink">
                <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[top.team] ?? "bg-faint"}`} aria-hidden="true" />
                Goes to {top.team}
              </span>
              <PriorityBadge priority={priority} />
              {result && (
                <span className="ml-auto flex items-center gap-[8px] text-[12px] tabular-nums text-muted-2">
                  <span className="h-[4px] w-[64px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <span className="grow-x block h-full rounded-full bg-lime-bright" style={{ width: `${result.confidence}%` }} />
                  </span>
                  {result.confidence}% sure
                </span>
              )}
            </div>

            {result && result.alternates.length > 0 && (
              <div className="flex flex-wrap items-center gap-[6px]">
                <span className="text-[12px] text-muted-2">Or maybe</span>
                {result.alternates.map((alt) => (
                  <button
                    key={alt.name}
                    type="button"
                    onClick={() => onPickAlternate(alt.name)}
                    className="inline-flex h-[26px] items-center gap-[6px] rounded-full border border-white/10 px-[10px] text-[12px] text-ink transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    {alt.name}
                    <span className="tabular-nums text-faint">{alt.score}%</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-[8px] border-t border-white/10 pt-[14px]">
              <Link
                href={continueHref}
                className="group inline-flex h-[36px] items-center gap-[8px] rounded-[9px] bg-primary px-[14px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Continue with this category
                <ArrowRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-[2px]" />
              </Link>
              <button
                type="button"
                onClick={onPickOther}
                className="h-[36px] rounded-[9px] px-[10px] text-[13px] font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                Not right? Pick another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.22, ease: EASE },
};

function ThinkingDots() {
  return (
    <span className="ml-[2px] inline-flex items-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-phn-pulse h-[4px] w-[4px] rounded-full bg-primary-light"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

/** Every category, grouped by the team it goes to, with a quick filter. */
function CategoryPicker({
  ref,
  categories,
  selected,
  onPick,
  onClose,
}: {
  ref: React.Ref<HTMLElement>;
  categories: Category[];
  selected: string | null;
  onPick: (name: string) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const extra = Array.from(new Set(categories.map((c) => c.team))).filter((t) => !(TEAMS as readonly string[]).includes(t));
    return [...TEAMS, ...extra]
      .map((team) => ({
        team,
        items: categories.filter((c) => c.team === team && (!q || c.name.toLowerCase().includes(q))),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, query]);

  return (
    <section ref={ref} aria-label="All categories" className="scroll-mt-[80px] rounded-[16px] border border-card-border/70 bg-surface p-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <h2 className="text-[13px] font-semibold text-ink">
          Pick a category <span className="font-normal text-muted-2">· {categories.length}</span>
        </h2>
        <div className="flex items-center gap-[4px]">
          <div className="relative">
            <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter categories"
              aria-label="Filter categories"
              className="h-[30px] w-[200px] rounded-[8px] border border-field-border bg-surface pl-[30px] pr-[10px] text-[13px] text-ink placeholder:text-faint hover:border-field-border-hover"
            />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the category list"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-[14px] text-[13px] text-muted-2">No category matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-[14px] flex flex-col gap-[14px]">
          {groups.map((g) => (
            <div key={g.team} className="flex flex-col gap-[8px]">
              <span className="flex items-center gap-[6px] text-[12px] text-muted-2">
                <span className={`h-[6px] w-[6px] rounded-full ${TEAM_DOT[g.team] ?? "bg-faint"}`} aria-hidden="true" />
                {teamShort(g.team)} team
              </span>
              <div className="flex flex-wrap gap-[6px]">
                {g.items.map((c) => {
                  const on = selected === c.name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onPick(c.name)}
                      aria-pressed={on}
                      className={`inline-flex h-[32px] items-center gap-[6px] rounded-[9px] border px-[12px] text-[13px] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] ${
                        on
                          ? "border-ink bg-ink text-paper"
                          : "border-card-border bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                      }`}
                    >
                      {on && <Check size={13} strokeWidth={2.5} />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
