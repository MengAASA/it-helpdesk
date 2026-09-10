"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type Feedback = "up" | "down" | null;

export default function TicketFeedback({
  ticketNumber,
  status,
  initialFeedback,
}: {
  ticketNumber: string;
  status: string;
  initialFeedback: Feedback;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendFeedback(value: "up" | "down") {
    if (submitting || feedback === value) return;
    const prev = feedback;
    setFeedback(value);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/tickets/${ticketNumber}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value }),
      });
      if (!res.ok) throw new Error("Could not save your feedback");
    } catch (err) {
      setFeedback(prev);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen() {
    setReopening(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/tickets/${ticketNumber}/reopen`, { method: "POST" });
      if (!res.ok) throw new Error("Could not reopen this ticket");
      setReopened(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReopening(false);
    }
  }

  if (status !== "Closed") return null;

  if (reopened) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-[9px] rounded-[14px] border border-[color:var(--color-blue)]/25 bg-[color:var(--color-blue-light)] px-[18px] py-[15px] text-[10.5px] font-medium text-[color:var(--color-blue-text)]"
      >
        <RotateCcw size={14} strokeWidth={2.25} />
        Ticket reopened. Our team has been notified.
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">Was this resolved?</span>

      <div className="flex items-center gap-[9px]">
        <motion.button
          type="button"
          onClick={() => sendFeedback("up")}
          whileTap={{ scale: 0.82 }}
          animate={feedback === "up" ? { scale: [1, 1.28, 1] } : { scale: 1 }}
          transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
          aria-label="Yes, it's resolved"
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border transition-colors ${
            feedback === "up"
              ? "border-[color:var(--color-emerald)] bg-[color:var(--color-emerald)] text-paper"
              : "border-card-border bg-paper text-muted hover:border-[color:var(--color-emerald)]/40 hover:text-[color:var(--color-emerald-text)]"
          }`}
        >
          <ThumbsUp size={16} strokeWidth={2.25} />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => sendFeedback("down")}
          whileTap={{ scale: 0.82 }}
          animate={feedback === "down" ? { scale: [1, 1.28, 1] } : { scale: 1 }}
          transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
          aria-label="No, it's not resolved"
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border transition-colors ${
            feedback === "down"
              ? "border-[color:var(--color-rose)] bg-[color:var(--color-rose)] text-paper"
              : "border-card-border bg-paper text-muted hover:border-[color:var(--color-rose)]/40 hover:text-[color:var(--color-rose-text)]"
          }`}
        >
          <ThumbsDown size={16} strokeWidth={2.25} />
        </motion.button>

        <AnimatePresence mode="wait">
          {feedback && (
            <motion.span
              key={feedback}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-[4.5px] text-[9.75px] font-medium text-muted"
            >
              <CheckCircle2 size={12} strokeWidth={2.25} className="text-[color:var(--color-emerald-text)]" />
              Thanks for letting us know!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {feedback === "down" ? (
          <motion.div
            key="prominent"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-[7.5px] border-t border-divider pt-[10.5px]">
              <p className="text-[9.75px] leading-[1.5] text-muted">
                Sorry to hear that. You can reopen this ticket and our team will take another look.
              </p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={reopening}
                className="inline-flex w-fit items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
              >
                <RotateCcw size={12} strokeWidth={2.25} />
                {reopening ? "Reopening…" : "Reopen this ticket"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="link"
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={reopening}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-fit text-[9px] font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reopening ? "Reopening…" : "Not actually fixed? Reopen this ticket"}
          </motion.button>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-[6px] text-[9px] font-medium text-amber-text-strong">
          <AlertTriangle size={11} strokeWidth={2.25} />
          {error}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Reopen this ticket?"
        description="Our IT team will be notified and will take another look. Only do this if the issue isn't actually resolved."
        confirmLabel="Reopen ticket"
        loading={reopening}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await handleReopen();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
