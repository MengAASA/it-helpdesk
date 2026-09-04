"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-[21px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex w-full max-w-[420px] flex-col gap-[15px] rounded-[14px] border border-card-border bg-white px-[21px] py-[19.5px] shadow-[0_24px_48px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-start justify-between gap-[12px]">
              <div className="flex items-start gap-[10.5px]">
                <span
                  className={`mt-[1.5px] flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
                    danger
                      ? "bg-amber-bg text-[color:var(--color-amber-solid)]"
                      : "bg-result-bg text-primary"
                  }`}
                >
                  <AlertTriangle size={15} strokeWidth={2.25} />
                </span>
                <div className="flex flex-col gap-[3px]">
                  <span className="text-[12.75px] font-semibold text-ink">{title}</span>
                  {description && (
                    <p className="text-[10.5px] leading-[1.5] text-muted">{description}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-faint hover:bg-result-bg hover:text-ink"
              >
                <X size={14} strokeWidth={2.25} />
              </button>
            </div>

            {children}

            <div className="flex items-center justify-end gap-[9px] pt-[3px]">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-card-border bg-paper px-[15px] py-[7.5px] text-[9.75px] font-semibold text-muted hover:border-primary/40 hover:text-primary"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-full px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60 ${
                  danger ? "bg-[color:var(--color-amber-solid)]" : "bg-admin-gradient"
                }`}
              >
                {loading ? "Please wait…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
