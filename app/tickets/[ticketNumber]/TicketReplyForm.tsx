"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle, Paperclip, X } from "lucide-react";

const MAX_FILES = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*";

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[9px] border-t border-divider pt-[13.5px]">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add more information or ask a question…"
        rows={3}
        className="w-full resize-none rounded-[10px] border border-card-border bg-paper px-[12px] py-[9px] font-body text-[10.5px] text-ink outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-primary/10"
      />

      <div className="flex flex-col gap-[6px]">
        <label className="inline-flex w-fit cursor-pointer items-center gap-[4.5px] text-[9px] font-semibold text-muted transition-colors hover:text-primary">
          <Paperclip size={11} strokeWidth={2.25} />
          Attach files
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {fileError && (
          <span className="text-[9px] font-semibold text-amber-text-strong">{fileError}</span>
        )}
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-[6px]">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-[6px] rounded-full border border-card-border bg-white px-[9px] py-[4.5px] text-[9px] text-ink"
              >
                <Paperclip size={10} strokeWidth={2.25} className="text-faint" />
                <span className="max-w-[150px] truncate">
                  {file.name} <span className="text-faint">({formatBytes(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-faint hover:text-[color:var(--color-rose)]"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-[4.5px] overflow-hidden"
          >
            <div className="h-[4px] w-full overflow-hidden rounded-full bg-card-border">
              <motion.div
                className="h-full rounded-full bg-admin-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            </div>
            <span className="text-[8.5px] text-faint">
              {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Almost done…"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-[6px] text-[9px] font-medium text-amber-text-strong">
          <AlertTriangle size={11} strokeWidth={2.25} />
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting || !message.trim()}
        className="inline-flex w-fit items-center gap-[6px] self-end whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
      >
        <Send size={12} strokeWidth={2.25} />
        {submitting ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
