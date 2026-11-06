"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle, Paperclip, X } from "lucide-react";

const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketReplyForm({ ticketNumber }: { ticketNumber: string }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const incoming = Array.from(selected);
    if (files.length + incoming.length > MAX_FILES) {
      setFileError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    const tooBig = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is larger than 5MB.`);
      return;
    }
    setFileError(null);
    setFiles((prev) => [...prev, ...incoming]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setUploadProgress(0);
    setError(null);
    try {
      const body = new FormData();
      body.append("message", trimmed);
      files.forEach((f) => body.append("attachments", f));

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${basePath}/api/tickets/${ticketNumber}/reply`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          let data: { error?: string } = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            // non-JSON response, fall through to status check
          }
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(data.error ?? "Could not send your reply"));
        };
        xhr.onerror = () => reject(new Error("Network error — could not send your reply"));
        xhr.send(body);
      });

      setUploadProgress(100);
      setMessage("");
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  const problem = fileError ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col overflow-hidden rounded-[14px] border border-card-border bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
    >
      <label htmlFor="ticket-reply" className="sr-only">
        Reply to IT
      </label>
      <textarea
        id="ticket-reply"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Add more information or ask a question…"
        rows={3}
        className="field-bare block min-h-[84px] w-full resize-none bg-transparent px-[16px] pb-[8px] pt-[12px] font-body text-[13px] leading-[21px] text-ink outline-none placeholder:text-faint"
      />

      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-wrap gap-[6px] overflow-hidden px-[16px]"
          >
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="mb-[10px] inline-flex h-[28px] max-w-full items-center gap-[6px] rounded-[8px] bg-surface-2 pl-[8px] pr-[4px] text-[12px] text-ink"
              >
                <Paperclip size={12} strokeWidth={2} className="shrink-0 text-muted-2" />
                <span className="min-w-0 max-w-[200px] truncate">{file.name}</span>
                <span className="shrink-0 tabular-nums text-muted-2">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px] text-faint transition-colors hover:bg-surface hover:text-ink"
                >
                  <X size={12} strokeWidth={2.25} />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-[10px] px-[16px] pb-[10px]">
              <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted-2">
                {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Almost done…"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-[8px] border-t border-divider p-[8px]">
        <label className="inline-flex h-[30px] cursor-pointer items-center gap-[6px] rounded-[8px] px-[8px] text-[12px] font-medium text-muted transition-colors focus-within:bg-surface-2 hover:bg-surface-2 hover:text-ink">
          <Paperclip size={14} strokeWidth={2} />
          Attach
          <span className="hidden font-normal text-faint sm:inline">· up to 2, 5MB each</span>
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <span className="ml-auto hidden text-[11px] text-faint md:inline">Ctrl / ⌘ + Enter</span>
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="group ml-auto inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] bg-ink px-[12px] text-[13px] font-medium text-paper transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 md:ml-0"
        >
          {submitting ? "Sending…" : "Send"}
          <Send
            size={13}
            strokeWidth={2}
            className="transition-transform duration-200 group-enabled:group-hover:-translate-y-[1px] group-enabled:group-hover:translate-x-[1px]"
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {problem && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <span className="flex items-center gap-[6px] border-t border-divider bg-rose-light px-[16px] py-[8px] text-[12px] font-medium text-rose-text">
              <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
              {problem}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
