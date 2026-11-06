"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import TypeToConfirm, { confirmMatches } from "@/app/admin/TypeToConfirm";

/** Header button on the admin ticket page. Only rendered for IAMS admins; the API checks again. */
export default function DeleteTicketButton({ ticketNumber }: { ticketNumber: string }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirmMatches(typed, ticketNumber);
  // The header animates in (a transform), which would trap a fixed dialog under the cards below it,
  // so the dialog renders on <body> once the page is in the browser.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  function close() {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  async function handleDelete() {
    if (!ready || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/tickets/${encodeURIComponent(ticketNumber)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not delete this ticket");
      }
      router.replace("/admin/tickets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this ticket");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] border border-card-border bg-surface px-[10px] text-[12px] font-medium text-muted transition-colors hover:border-rose-text/40 hover:bg-rose-light hover:text-rose-text"
      >
        <Trash2 size={14} strokeWidth={2} />
        Delete
      </button>
      {mounted &&
        createPortal(
          <ConfirmDialog
            open={open}
            danger
            loading={deleting}
            confirmDisabled={!ready}
            title={`Delete ${ticketNumber}?`}
            description="This permanently removes the ticket, its conversation, history and attached files. It will also disappear from reports. This can't be undone."
            confirmLabel="Delete ticket"
            onConfirm={handleDelete}
            onCancel={close}
          >
            <TypeToConfirm phrase={ticketNumber} value={typed} onChange={setTyped} onSubmit={handleDelete} />
            {error && (
              <p role="alert" className="text-[12px] text-rose-text">
                {error}
              </p>
            )}
          </ConfirmDialog>,
          document.body
        )}
    </>
  );
}
