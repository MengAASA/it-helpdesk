"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, RotateCcw, Check, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
        className="flex items-center gap-[8px] rounded-[14px] bg-primary-soft px-[16px] py-[12px] text-[13px] font-medium text-primary"
      >
        <RotateCcw size={14} strokeWidth={2} />
        Ticket reopened. The IT team has been notified.
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px] rounded-[14px] border border-card-border bg-surface p-[16px]">
      <div className="flex flex-col gap-[2px]">
        <span className="text-[13px] font-semibold text-ink">Was this sorted?</span>
        <span className="text-[12px] text-muted-2">This ticket is closed. Let IT know whether the fix worked.</span>
      </div>

      <div className="flex flex-wrap items-center gap-[8px]">
        <FeedbackButton
          icon={ThumbsUp}
          label="Yes, all good"
          selected={feedback === "up"}
          tone="good"
          onClick={() => sendFeedback("up")}
        />
        <FeedbackButton
          icon={ThumbsDown}
          label="Not really"
          selected={feedback === "down"}
          tone="bad"
          onClick={() => sendFeedback("down")}
        />
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.span
              key={feedback}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-[4px] text-[12px] text-muted-2"
            >
              <Check size={13} strokeWidth={2.25} className="text-[color:var(--color-emerald-text)]" />
              Thanks for letting us know
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
            <div className="flex flex-col gap-[10px] border-t border-divider pt-[12px] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] leading-[18px] text-muted-2">
                Sorry about that. Reopen the ticket and IT will take another look.
              </p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={reopening}
                className="inline-flex h-[32px] w-fit shrink-0 items-center gap-[6px] whitespace-nowrap rounded-[8px] bg-ink px-[12px] text-[13px] font-medium text-paper transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
              >
                <RotateCcw size={13} strokeWidth={2} />
                {reopening ? "Reopening…" : "Reopen ticket"}
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
            className="w-fit text-[12px] font-medium text-muted-2 underline decoration-card-border underline-offset-[3px] transition-colors hover:text-ink hover:decoration-current disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reopening ? "Reopening…" : "Not actually fixed? Reopen this ticket"}
          </motion.button>
        )}
      </AnimatePresence>

      {error && (
        <div role="alert" className="flex items-center gap-[6px] text-[12px] font-medium text-rose-text">
          <AlertTriangle size={13} strokeWidth={2} />
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

function FeedbackButton({
  icon: Icon,
  label,
  selected,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  tone: "good" | "bad";
  onClick: () => void;
}) {
  const on =
    tone === "good"
      ? "border-[color:var(--color-emerald)] bg-[color:var(--color-emerald)] text-white"
      : "border-[color:var(--color-rose)] bg-[color:var(--color-rose)] text-white";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.94 }}
      animate={selected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={`inline-flex h-[32px] items-center gap-[6px] rounded-full border px-[12px] text-[13px] font-medium transition-colors ${
        selected ? on : "border-card-border bg-surface text-ink hover:border-field-border-hover hover:bg-surface-2"
      }`}
    >
      <motion.span
        animate={selected ? { rotate: tone === "good" ? [0, -14, 0] : [0, 14, 0] } : { rotate: 0 }}
        transition={{ duration: 0.35 }}
        className="flex"
      >
        <Icon size={14} strokeWidth={2} />
      </motion.span>
      {label}
    </motion.button>
  );
}
