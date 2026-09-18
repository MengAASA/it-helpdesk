"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, ListTree, ChevronRight } from "lucide-react";
import { teamFor, type Category } from "@/app/lib/categories";
import HowToGuide from "./HowToGuide";

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

type ClassifyResult = {
  category: string;
  confidence: number;
  reason: string;
  team: string;
  priority: "Low" | "Normal" | "High";
  alternates: { name: string; score: number }[];
};

export default function SubmitForm({ categories }: { categories: Category[] }) {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

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

  const top = chosen
    ? {
        category: chosen,
        team: teamFor(categories, chosen),
        reason: "You selected this category manually.",
      }
    : result
      ? { category: result.category, team: result.team, reason: result.reason }
      : null;

  const hasResult = !loading && !!top;
  const charHint =
    desc.trim().length < 12
      ? "Type at least a sentence. The more detail, the better the routing."
      : `${desc.trim().split(/\s+/).length} words read`;

  const pickCategory = (name: string) => {
    setChosen(name);
    setBrowsing(false);
  };

  return (
    <main className="mx-auto flex w-full flex-1 flex-col gap-[24px] px-[42px] pb-[67.5px] pt-[42px]">
      <div className="flex flex-col gap-[10.5px]">
        <h1 className="font-heading text-[27px] font-semibold tracking-[-0.02em]">
          What can we help you with?
        </h1>
        <p className="max-w-[495px] text-[12.75px] leading-[1.6] text-muted">
          No need to guess a category, just describe the problem and we will sort it out.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-[24px]">
      <div className="flex flex-col overflow-hidden rounded-[10.5px] border border-card-border bg-white">
        <div className="flex items-center gap-[10.5px] border-b border-divider bg-result-bg/50 px-[21px] py-[13.5px]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-admin-gradient text-paper">
            <Sparkles size={14} strokeWidth={2.25} />
          </span>
          <p className="text-[11.25px] leading-[1.55] text-ink">
            <span className="font-semibold">Hi, I&apos;m Boboi.</span> Write your problem in
            your own words below and I&apos;ll match it to the right helpdesk category for you.
          </p>
        </div>
        <div className="flex flex-col gap-[9px] px-[21px] pb-[16.5px] pt-[19.5px]">
          <label
            htmlFor="issue"
            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2"
          >
            Describe your issue
          </label>
          <textarea
            id="issue"
            rows={4}
            value={desc}
            onChange={(e) => handleDescChange(e.target.value)}
            placeholder="e.g. Baan gives an error when I try to release a purchase order, and it started this morning."
            className="w-full resize-y rounded-[7.5px] border border-card-border bg-paper px-[12px] py-[10.5px] font-body text-xs leading-[1.6] text-ink outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between gap-[12px] text-[9px] text-faint">
            <span>{charHint}</span>
            <button
              type="button"
              onClick={() => setBrowsing((b) => !b)}
              className="text-[9px] font-semibold text-primary"
            >
              {browsing ? "Hide the full category list" : "Prefer to pick the category yourself?"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="animate-phn-pulse flex items-center gap-[9px] border-t border-divider bg-result-bg px-[21px] py-[13.5px] text-[10.5px] font-medium text-primary">
            <Sparkles size={13} strokeWidth={2.25} /> Reading your description…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-[9px] border-t border-divider bg-amber-bg px-[21px] py-[13.5px] text-[10.5px] font-medium text-amber-text-strong">
            {error}
          </div>
        )}

        {hasResult && top && (
          <div className="animate-phn-rise flex flex-col gap-[15px] border-t border-divider bg-result-bg px-[21px] pb-[21px] pt-[18px]">
            <div className="flex items-center justify-between gap-[12px]">
              <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles size={12} strokeWidth={2.25} /> Suggested category
              </span>
              {result && (
                <span className="font-mono-plex text-[9px] text-muted-2">
                  {result.confidence}% match
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[9px] rounded-[12px] border border-result-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="font-heading text-[18px] font-semibold tracking-[-0.01em]">
                {top.category}
              </span>
              <p className="text-[10.5px] leading-[1.6] text-muted">{top.reason}</p>
              <div className="mt-[3px] flex flex-wrap items-center gap-[7.5px]">
                <span className="text-[9px] text-muted-2">Suggested priority</span>
                <span
                  className={`rounded-full border px-[8.25px] py-[3.75px] text-[9px] font-semibold ${
                    PRIORITY_STYLES[result?.priority ?? "Normal"] ?? PRIORITY_STYLES.Normal
                  }`}
                >
                  {result ? result.priority : "Normal"}
                </span>
                <span className="text-[9px] text-muted-2">Routed to</span>
                <span className="rounded-full border border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] px-[8.25px] py-[3.75px] text-[9px] font-semibold text-[color:var(--color-violet-text)]">
                  {top.team}
                </span>
              </div>
            </div>

            {result && result.alternates.length > 0 && (
              <div className="flex flex-col gap-[7.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                  Or one of these
                </span>
                <div className="flex flex-wrap gap-[7.5px]">
                  {result.alternates.map((alt) => (
                    <button
                      key={alt.name}
                      type="button"
                      onClick={() => pickCategory(alt.name)}
                      className="inline-flex items-center gap-[7.5px] rounded-full border border-card-border bg-white px-[11.25px] py-[6px] text-[9.75px] font-medium text-ink transition-colors hover:border-[color:var(--color-blue)]/40 hover:text-[color:var(--color-blue-text)]"
                    >
                      {alt.name}{" "}
                      <span className="font-mono-plex text-[8.25px] text-faint">
                        {alt.score}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-[10.5px] pt-[4.5px]">
              <Link
                href={`/submit/ticket?${new URLSearchParams({
                  category: top.category,
                  team: top.team,
                  priority: result?.priority ?? "Normal",
                  description: desc,
                }).toString()}`}
                className="inline-flex items-center gap-[7.5px] whitespace-nowrap rounded-full bg-admin-gradient px-[19.5px] py-[9.75px] text-[10.5px] font-semibold text-paper shadow-[0_4px_12px_rgba(46,16,101,0.3)] transition-transform hover:-translate-y-[1px]"
              >
                Continue with this category <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
              <button
                type="button"
                onClick={() => setBrowsing(true)}
                className="text-[9.75px] font-semibold text-primary"
              >
                Not right? Choose it myself
              </button>
            </div>
          </div>
        )}
      </div>

      {browsing && (
        <div className="flex flex-col gap-[10.5px]">
          <div className="flex items-baseline justify-between gap-[12px]">
            <span className="inline-flex items-center gap-[6px] font-heading text-[15px] font-semibold">
              <ListTree size={14} strokeWidth={2.25} className="text-primary" /> All categories
            </span>
            <span className="text-[9.75px] text-faint">{categories.length} categories</span>
          </div>
          <div className="grid grid-cols-2 gap-[7.5px]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => pickCategory(cat.name)}
                className="flex items-center justify-between gap-[10.5px] rounded-[10px] border border-card-border bg-white px-[13.5px] py-[11.25px] text-left text-[11.25px] font-medium text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[color:var(--color-blue)]/40 hover:text-[color:var(--color-blue-text)]"
              >
                {cat.name}
                <ChevronRight size={13} strokeWidth={2.25} className="text-faint" />
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      <div className="lg:sticky lg:top-[84px]">
        <HowToGuide />
      </div>
      </div>
    </main>
  );
}
