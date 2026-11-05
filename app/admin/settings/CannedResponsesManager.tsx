"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { CannedResponse } from "@/app/lib/cannedResponses";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { Field, Notice, Panel, PanelHeader, SwitchRow, btnGhost, btnPrimary, iconBtn, inputClass, textareaClass } from "./settingsParts";

const EASE = [0.22, 1, 0.36, 1] as const;

function VisibilityTag({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`inline-flex h-[20px] shrink-0 items-center gap-[4px] rounded-full px-[7px] text-[11px] font-medium ${
        isPublic ? "bg-emerald-light text-emerald-text" : "bg-surface-2 text-muted-2"
      }`}
    >
      {isPublic ? <Eye size={11} strokeWidth={2} /> : <EyeOff size={11} strokeWidth={2} />}
      {isPublic ? "Visible to requester" : "Internal"}
    </span>
  );
}

/** Title, text and visibility, shared by the add form and the inline editor. */
function ReplyFields({
  title,
  setTitle,
  text,
  setText,
  isPublic,
  setIsPublic,
  autoFocus,
}: {
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <Field label="Title">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Password reset steps" autoFocus={autoFocus} className={inputClass} />
      </Field>
      <Field label="Reply text">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Reply text…" className={textareaClass} />
      </Field>
      <SwitchRow
        label="Visible to requester by default"
        hint={isPublic ? "Starts as a reply the requester can see" : "Starts as an internal note"}
        checked={isPublic}
        onChange={setIsPublic}
      />
    </>
  );
}

export default function CannedResponsesManager({ initialResponses }: { initialResponses: CannedResponse[] }) {
  const router = useRouter();
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
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function cancelAdd() {
    setAdding(false);
    setTitle("");
    setText("");
    setIsPublic(false);
    setError(null);
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
          .map((r) => (r.id === editingId ? { id: editingId, title: editTitle.trim(), body: editText.trim(), isPublic: editIsPublic } : r))
          .sort((a, b) => a.title.localeCompare(b.title)),
      );
      setEditingId(null);
      router.refresh();
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
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const publicCount = responses.filter((r) => r.isPublic).length;

  return (
    <Panel>
      <PanelHeader
        title="Canned replies"
        description={
          <>
            Saved replies agents can drop into a ticket.{" "}
            <span className="tabular-nums">
              {responses.length} {responses.length === 1 ? "reply" : "replies"} · {publicCount} visible to requesters
            </span>
          </>
        }
        action={
          <button type="button" onClick={() => setAdding(true)} disabled={adding} className={btnPrimary}>
            <Plus size={14} strokeWidth={2} />
            Add reply
          </button>
        }
      />

      {error && (
        <div className="px-[20px] pb-[16px]">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            key="add-form"
            onSubmit={handleAdd}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mx-[12px] mb-[12px] flex flex-col gap-[12px] rounded-[12px] bg-primary-soft/60 p-[12px]">
              <ReplyFields
                title={title}
                setTitle={setTitle}
                text={text}
                setText={setText}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                autoFocus
              />
              <div className="flex items-center justify-end gap-[8px]">
                <button type="button" onClick={cancelAdd} className={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !title.trim() || !text.trim()} className={btnPrimary}>
                  {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                  {saving ? "Adding…" : "Add reply"}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {responses.length === 0 ? (
        <div className="flex flex-col items-center gap-[4px] border-t border-card-border/60 px-[16px] py-[40px] text-center">
          <p className="text-[13px] font-medium text-ink">No canned replies yet</p>
          <p className="text-[12px] text-muted-2">Add one and agents can insert it into any ticket.</p>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-card-border/60 px-[6px] py-[6px]">
          <AnimatePresence initial={false}>
            {responses.map((r) => (
              <motion.li
                key={r.id}
                layout="position"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="group/reply overflow-hidden"
              >
                {editingId === r.id ? (
                  <div className="m-[6px] flex flex-col gap-[12px] rounded-[12px] bg-surface-2/60 p-[12px]">
                    <ReplyFields
                      title={editTitle}
                      setTitle={setEditTitle}
                      text={editText}
                      setText={setEditText}
                      isPublic={editIsPublic}
                      setIsPublic={setEditIsPublic}
                    />
                    <div className="flex items-center justify-end gap-[8px]">
                      <button type="button" onClick={cancelEdit} className={btnGhost}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit || !editTitle.trim() || !editText.trim()}
                        onClick={handleSaveEdit}
                        className={btnPrimary}
                      >
                        {savingEdit && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-[12px] rounded-[10px] px-[14px] py-[12px] transition-colors duration-150 hover:bg-surface-2/50">
                    <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                      <div className="flex min-w-0 flex-wrap items-center gap-[8px]">
                        <span className="truncate text-[13px] font-medium text-ink">{r.title}</span>
                        <VisibilityTag isPublic={r.isPublic} />
                      </div>
                      <p className="line-clamp-2 whitespace-pre-wrap text-[13px] leading-[20px] text-muted-2" title={r.body}>
                        {r.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-[2px] opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/reply:opacity-100 [@media(hover:none)]:opacity-100">
                      <button type="button" onClick={() => startEdit(r)} aria-label={`Edit ${r.title}`} className={iconBtn}>
                        <Pencil size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(r)}
                        aria-label={`Delete ${r.title}`}
                        className={`${iconBtn} hover:bg-rose-light hover:text-rose-text`}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this reply?"
        description={pendingDelete ? `"${pendingDelete.title}" will no longer be available to insert into replies.` : undefined}
        danger
        loading={deleting}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </Panel>
  );
}
