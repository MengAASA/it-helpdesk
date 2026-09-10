"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function HowToGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-[12px] rounded-[10.5px] border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)]/40 px-[18px] py-[15px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-[9px] text-left"
      >
        <span className="inline-flex items-center gap-[7.5px] text-[11.25px] font-semibold text-[color:var(--color-blue-text)]">
          <HelpCircle size={14} strokeWidth={2.25} />
          How to submit a ticket · Cara menghantar tiket
        </span>
        <motion.span
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-[color:var(--color-blue-text)]"
        >
          {open ? <ChevronUp size={14} strokeWidth={2.25} /> : <ChevronDown size={14} strokeWidth={2.25} />}
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-[15px]">
              <div className="flex flex-col gap-[7.5px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-2">
                  English
                </span>
                <ol className="flex list-decimal flex-col gap-[6px] pl-[16px] text-[11.25px] leading-[1.6] text-ink">
                  <li>
                    Describe your problem in the box below, in your own words (e.g. &quot;My
                    printer is not working&quot;).
                  </li>
                  <li>Wait a few seconds. The system will suggest the right category for you automatically.</li>
                  <li>
                    Click <strong>Continue with this category</strong> to proceed.
                  </li>
                  <li>
                    Fill in your name, phone number and other details, then click{" "}
                    <strong>Submit ticket</strong>.
                  </li>
                </ol>
                <p className="text-[10.5px] leading-[1.6] text-muted">
                  Don&apos;t want to type a description? Click{" "}
                  <strong>Prefer to pick the category yourself?</strong> to choose it manually
                  from a list instead.
                </p>
              </div>

              <div className="flex flex-col gap-[7.5px] border-t border-[color:var(--color-blue)]/20 pt-[12px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-2">
                  Bahasa Malaysia
                </span>
                <ol className="flex list-decimal flex-col gap-[6px] pl-[16px] text-[11.25px] leading-[1.6] text-ink">
                  <li>
                    Terangkan masalah anda dalam kotak di bawah, menggunakan ayat sendiri
                    (contoh: &quot;Pencetak saya tidak berfungsi&quot;).
                  </li>
                  <li>Tunggu beberapa saat, sistem akan mencadangkan kategori yang sesuai secara automatik.</li>
                  <li>
                    Klik <strong>Continue with this category</strong> untuk teruskan.
                  </li>
                  <li>
                    Isikan nama, nombor telefon dan maklumat lain, kemudian klik{" "}
                    <strong>Submit ticket</strong>.
                  </li>
                </ol>
                <p className="text-[10.5px] leading-[1.6] text-muted">
                  Tidak mahu menaip penerangan? Klik{" "}
                  <strong>Prefer to pick the category yourself?</strong> untuk pilih kategori
                  secara manual daripada senarai.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
