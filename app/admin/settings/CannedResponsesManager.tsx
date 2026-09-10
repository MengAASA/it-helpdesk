"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle, Check, X } from "lucide-react";
import type { CannedResponse } from "@/app/lib/cannedResponses";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function CannedResponsesManager({
  initialResponses,
}: {
  initialResponses: CannedResponse[];
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [responses, setResponses] = useState(initialResponses);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CannedResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/canned-responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: text.trim(), isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add template");
      setResponses((prev) => [...prev, data as CannedResponse].sort((a, b) => a.title.localeCompare(b.title)));
      setTitle("");
      setText("");
      setIsPublic(false);
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: CannedResponse) {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditText(r.body);
    setEditIsPublic(r.isPublic);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit() {
    if (editingId === null || !editTitle.trim() || !editText.trim()) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/canned-responses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editText.trim(), isPublic: editIsPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save template");
      setResponses((prev) =>
        prev
          .map((r) =>
            r.id === editingId ? { id: editingId, title: editTitle.trim(), body: editText.trim(), isPublic: editIsPublic } : r
          )
          .sort((a, b) => a.title.localeCompare(b.title))
      );
      setEditingId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${basePath}/api/admin/canned-responses/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete template");
      setResponses((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError((err as Error).message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-[15px]">
      {error && (
        <div className="flex items-center gap-[7.5px] rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
          <AlertTriangle size={12} strokeWidth={2.25} />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!adding ? (
          <motion.button
            key="add-button"
            type="button"
            onClick={() => setAdding(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="inline-flex w-fit items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper"
          >
            <Plus size={12} strokeWidth={2.5} />
            Add template
          </motion.button>
        ) : (
          <motion.form
            key="add-form"
            onSubmit={handleAdd}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col gap-[10.5px] overflow-hidden rounded-[12px] border border-card-border bg-white px-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={{ paddingTop: 13.5, paddingBottom: 13.5 }}
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Template title"
              autoFocus
              className="w-full rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[7.5px] text-[10.5px] text-ink outline-none focus:border-primary"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Reply text…"
              className="w-full resize-y rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[8px] text-[10.5px] text-ink outline-none focus:border-primary"
            />
            <label className="inline-flex w-fit cursor-pointer items-center gap-[7.5px] text-[9.75px] font-medium text-muted">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-[12px] w-[12px] accent-[color:var(--color-emerald)]"
              />
              <span className="inline-flex items-center gap-[4.5px]">
                {isPublic ? (
                  <Eye size={11} strokeWidth={2.25} className="text-[color:var(--color-emerald-text)]" />
                ) : (
                  <EyeOff size={11} strokeWidth={2.25} />
                )}
                Visible to requester by default
              </span>
            </label>
            <div className="flex items-center gap-[9px]">
              <button
                type="submit"
                disabled={saving || !title.trim() || !text.trim()}
                className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                  setText("");
                  setIsPublic(false);
                  setError(null);
                }}
                className="text-[9.75px] font-semibold text-muted hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-[9px]">
        <AnimatePresence initial={false}>
          {responses.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[9px] rounded-[12px] border border-card-border bg-white px-[15px] py-[13.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              {editingId === r.id ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[7.5px] text-[10.5px] text-ink outline-none focus:border-primary"
                  />
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[8px] text-[10.5px] text-ink outline-none focus:border-primary"
                  />
                  <label className="inline-flex w-fit cursor-pointer items-center gap-[7.5px] text-[9.75px] font-medium text-muted">
                    <input
                      type="checkbox"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="h-[12px] w-[12px] accent-[color:var(--color-emerald)]"
                    />
                    <span className="inline-flex items-center gap-[4.5px]">
                      {editIsPublic ? (
                        <Eye size={11} strokeWidth={2.25} className="text-[color:var(--color-emerald-text)]" />
                      ) : (
                        <EyeOff size={11} strokeWidth={2.25} />
                      )}
                      Visible to requester by default
                    </span>
                  </label>
                  <div className="flex items-center gap-[9px]">
                    <button
                      type="button"
                      disabled={savingEdit || !editTitle.trim() || !editText.trim()}
                      onClick={handleSaveEdit}
                      className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
                    >
                      <Check size={11} strokeWidth={2.5} />
                      {savingEdit ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-[4.5px] text-[9.75px] font-semibold text-muted hover:text-primary"
                    >
                      <X size={11} strokeWidth={2.5} />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-[9px]">
                    <div className="flex items-center gap-[7.5px]">
                      <span className="text-[10.5px] font-semibold text-ink">{r.title}</span>
                      <span
                        className={`inline-flex items-center gap-[3px] rounded-full border px-[6px] py-[1.5px] text-[8px] font-semibold uppercase tracking-[0.04em] ${
                          r.isPublic
                            ? "border-[color:var(--color-emerald)]/30 bg-white text-[color:var(--color-emerald-text)]"
                            : "border-card-border bg-white text-muted-2"
                        }`}
                      >
                        {r.isPublic ? <Eye size={9} strokeWidth={2.5} /> : <EyeOff size={9} strokeWidth={2.5} />}
                        {r.isPublic ? "Visible to requester" : "Internal"}
                      </span>
                    </div>
                    <div className="flex items-center gap-[6px]">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        aria-label={`Edit ${r.title}`}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-faint hover:bg-result-bg hover:text-primary"
                      >
                        <Pencil size={12} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(r)}
                        aria-label={`Delete ${r.title}`}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-faint hover:bg-result-bg hover:text-[color:var(--color-rose-text)]"
                      >
                        <Trash2 size={12} strokeWidth={2.25} />
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-[10.5px] leading-[1.5] text-muted">{r.body}</p>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {responses.length === 0 && (
          <p className="text-[10.5px] text-faint">No templates yet. Add one above to get started.</p>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this template?"
        description={pendingDelete ? `"${pendingDelete.title}" will no longer be available to insert into replies.` : undefined}
        danger
        loading={deleting}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
