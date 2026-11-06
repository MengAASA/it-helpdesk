"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Lang = "en" | "ms";

/** Button names stay in English in both languages, because that's what the buttons say. */
const GUIDE: Record<Lang, { title: string; steps: React.ReactNode[]; tip: React.ReactNode }> = {
  en: {
    title: "How it works",
    steps: [
      <>Describe the problem in your own words, e.g. &ldquo;My printer is not working&rdquo;.</>,
      <>Wait a moment. Boboi suggests the right category for you.</>,
      <>
        Click <strong className="font-medium text-ink">Continue with this category</strong>.
      </>,
      <>
        Fill in your details, then click <strong className="font-medium text-ink">Submit ticket</strong>.
      </>,
    ],
    tip: (
      <>
        Rather choose it yourself? Click <strong className="font-medium text-ink">Pick the category myself</strong>.
      </>
    ),
  },
  ms: {
    title: "Cara menghantar tiket",
    steps: [
      <>Terangkan masalah anda menggunakan ayat sendiri, contoh: &ldquo;Pencetak saya tidak berfungsi&rdquo;.</>,
      <>Tunggu sebentar. Boboi akan mencadangkan kategori yang sesuai.</>,
      <>
        Klik <strong className="font-medium text-ink">Continue with this category</strong>.
      </>,
      <>
        Isikan maklumat anda, kemudian klik <strong className="font-medium text-ink">Submit ticket</strong>.
      </>,
    ],
    tip: (
      <>
        Mahu pilih sendiri? Klik <strong className="font-medium text-ink">Pick the category myself</strong>.
      </>
    ),
  },
};

export default function HowToGuide() {
  const [lang, setLang] = useState<Lang>("en");
  const g = GUIDE[lang];

  return (
    <section aria-label="How to submit a ticket" className="rounded-[16px] border border-card-border/60 bg-surface p-[16px]">
      <div className="flex items-center justify-between gap-[12px]">
        <h2 className="text-[13px] font-semibold text-ink">{g.title}</h2>
        <div role="tablist" aria-label="Language" className="inline-flex h-[26px] items-center rounded-[7px] bg-surface-2 p-[2px]">
          {(["en", "ms"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={`relative h-[22px] rounded-[5px] px-[8px] text-[11px] font-medium transition-colors ${
                lang === l ? "text-ink" : "text-muted-2 hover:text-ink"
              }`}
            >
              {lang === l && (
                <motion.span
                  layoutId="guide-lang"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="absolute inset-0 rounded-[5px] bg-surface shadow-card"
                />
              )}
              <span className="relative">{l === "en" ? "EN" : "BM"}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lang}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ol className="mt-[12px] flex flex-col gap-[10px]">
            {g.steps.map((step, i) => (
              <li key={i} className="flex gap-[10px] text-[13px] leading-[20px] text-muted">
                <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium tabular-nums text-ink">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-[12px] border-t border-card-border/60 pt-[12px] text-[12px] leading-[18px] text-muted-2">{g.tip}</p>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
