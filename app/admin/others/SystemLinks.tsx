"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import type { ExternalSystem } from "@/app/lib/externalSystems";
import type { SystemLink } from "@/app/lib/systemLinks";
import { Field, Notice, btnGhost, btnPrimary, iconBtn, inputClass, textareaClass } from "../settings/settingsParts";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD_MOTION = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.18, ease: EASE },
};

/** "https://www.portal.phn.com.my/login" → "portal.phn.com.my". */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function byName(a: SystemLink, b: SystemLink) {
  return a.name.localeCompare(b.name) || a.id - b.id;
}

type Draft = { name: string; url: string; description: string };
const EMPTY_DRAFT: Draft = { name: "", url: "", description: "" };

export default function SystemLinks({
  builtIns,
  initialLinks,
  canManage,
}: {
  builtIns: ExternalSystem[];
  initialLinks: SystemLink[];
  canManage: boolean;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [links, setLinks] = useState(() => [...initialLinks].sort(byName));
  // null: no editor open; "new": adding; a number: editing that link.
  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SystemLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditing("new");
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  }

  function openEdit(link: SystemLink) {
    setEditing(link.id);
    setDraft({ name: link.name, url: link.url, description: link.description ?? "" });
    setFormError(null);
  }

  function closeEditor() {
    setEditing(null);
    setFormError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editing === null || !draft.name.trim() || !draft.url.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const res = await fetch(`${basePath}/api/admin/system-links${isNew ? "" : `/${editing}`}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the link");
      const saved = data as SystemLink;
      setLinks((prev) => (isNew ? [...prev, saved] : prev.map((l) => (l.id === saved.id ? saved : l))).sort(byName));
      setEditing(null);
      router.refresh();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/system-links/${pendingDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not remove the link");
      setLinks((prev) => prev.filter((l) => l.id !== pendingDelete.id));
      if (editing === pendingDelete.id) setEditing(null);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const editor = (mode: "new" | "edit") => (
    <LinkEditor
      mode={mode}
      draft={draft}
      setDraft={setDraft}
      saving={saving}
      error={formError}
      onSubmit={handleSave}
      onCancel={closeEditor}
    />
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Other systems</h1>
          <p className="text-[13px] text-muted-2">
            Quick links to the other IT systems. They open in a new tab, and every link here also shows in the IAMS sidebar.
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={openNew} disabled={editing === "new"} className={btnPrimary}>
            <Plus size={14} strokeWidth={2} />
            Add link
          </button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-[12px] @min-[620px]:grid-cols-2 @min-[960px]:grid-cols-3">
          {builtIns.map((s) => (
            <BuiltInCard key={s.name} system={s} />
          ))}

          <AnimatePresence initial={false} mode="popLayout">
            {editing === "new" && (
              <motion.div key="new" layout {...CARD_MOTION}>
                {editor("new")}
              </motion.div>
            )}
            {links.map((link) => (
              <motion.div key={link.id} layout {...CARD_MOTION}>
                {editing === link.id ? (
                  editor("edit")
                ) : (
                  <LinkCard link={link} canManage={canManage} onEdit={() => openEdit(link)} onDelete={() => setPendingDelete(link)} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {links.length === 0 && editing !== "new" && (
            <div className="flex min-h-[152px] flex-col justify-center gap-[4px] rounded-[16px] border border-card-border/60 bg-surface/60 p-[16px]">
              <p className="text-[13px] font-medium text-ink">No extra links yet</p>
              <p className="text-[12px] leading-[18px] text-muted-2">
                {canManage
                  ? "Add the portals and tools your IT team uses, such as the VPN portal or the Microsoft 365 admin centre."
                  : "An admin can add links to the other IT tools here."}
              </p>
              {canManage && (
                <button type="button" onClick={openNew} className={`${btnGhost} mt-[8px] w-fit px-[8px] text-primary hover:text-primary`}>
                  <Plus size={14} strokeWidth={2} />
                  Add the first link
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this link?"
        description={pendingDelete ? `"${pendingDelete.name}" will disappear from this page and from the IAMS sidebar.` : undefined}
        danger
        loading={deleting}
        confirmLabel="Remove"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Systems that ship with the helpdesk (IAMS). Configured on the server, so they can't be edited here. */
function BuiltInCard({ system }: { system: ExternalSystem }) {
  const live = !!system.url;
  return (
    <article
      className={`tile-ink group/card relative flex min-h-[152px] flex-col rounded-[16px] p-[16px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring ${
        live ? "" : "opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-[12px]">
        <span className="inline-flex h-[22px] items-center rounded-full bg-white/10 px-[8px] text-[12px] font-medium text-ink">Built in</span>
        {live && <span className="truncate text-[12px] text-muted-2">{hostOf(system.url!)}</span>}
      </div>
      <h2 className="mt-[14px] text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {live ? (
          <a
            href={system.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none after:absolute after:inset-0 after:rounded-[16px] after:content-['']"
          >
            {system.name}
          </a>
        ) : (
          system.name
        )}
      </h2>
      <p className="mt-[4px] line-clamp-2 text-[13px] leading-[20px] text-muted">{system.description}</p>
      <div className="mt-auto flex items-center justify-end pt-[16px] text-[12px]">
        {live ? (
          <OpenHint />
        ) : (
          <span className="mr-auto inline-flex items-center gap-[6px] text-chart-amber">
            <span className="h-[6px] w-[6px] rounded-full bg-chart-amber" aria-hidden="true" />
            Not configured on this server
          </span>
        )}
      </div>
    </article>
  );
}

function LinkCard({
  link,
  canManage,
  onEdit,
  onDelete,
}: {
  link: SystemLink;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group/card relative flex h-full min-h-[152px] flex-col rounded-[16px] border border-card-border/50 bg-surface p-[16px] transition-[border-color,box-shadow] duration-200 hover:border-card-border hover:shadow-card has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring">
      <div className="flex min-h-[28px] items-center justify-between gap-[12px]">
        <span className="inline-flex h-[22px] min-w-0 items-center rounded-full bg-surface-2 px-[8px] text-[12px] text-muted">
          <span className="truncate">{hostOf(link.url)}</span>
        </span>
        {canManage && (
          <div className="relative z-10 flex shrink-0 items-center gap-[2px] opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100">
            <button type="button" onClick={onEdit} aria-label={`Edit ${link.name}`} className={iconBtn}>
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={onDelete} aria-label={`Remove ${link.name}`} className={`${iconBtn} hover:bg-rose-light hover:text-rose-text`}>
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
      <h2 className="mt-[10px] truncate text-[15px] font-semibold tracking-[-0.01em] text-ink" title={link.name}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="outline-none after:absolute after:inset-0 after:rounded-[16px] after:content-['']"
        >
          {link.name}
        </a>
      </h2>
      {link.description && <p className="mt-[4px] line-clamp-2 text-[13px] leading-[20px] text-muted-2">{link.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-[12px] pt-[16px] text-[12px]">
        <span className="inline-flex items-center gap-[6px] text-muted-2">
          <span className="h-[6px] w-[6px] rounded-full bg-lime-bright" aria-hidden="true" />
          Also in IAMS
        </span>
        <OpenHint />
      </div>
    </article>
  );
}

function OpenHint() {
  return (
    <span className="inline-flex items-center gap-[4px] font-medium text-ink">
      Open
      <ArrowUpRight
        size={14}
        strokeWidth={2}
        className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/card:-translate-y-[1px] group-hover/card:translate-x-[1px] motion-reduce:transition-none"
      />
    </span>
  );
}

function LinkEditor({
  mode,
  draft,
  setDraft,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "new" | "edit";
  draft: Draft;
  setDraft: (d: Draft) => void;
  saving: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [key]: e.target.value });
  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="flex h-full flex-col gap-[12px] rounded-[16px] border border-primary/25 bg-primary-soft/50 p-[16px]"
    >
      <h2 className="text-[13px] font-semibold text-ink">{mode === "new" ? "New link" : "Edit link"}</h2>
      <Field label="Name">
        <input value={draft.name} onChange={set("name")} placeholder="e.g. VPN portal" maxLength={80} autoFocus className={inputClass} />
      </Field>
      <Field label="Address">
        <input value={draft.url} onChange={set("url")} placeholder="https://vpn.phn.com.my" maxLength={500} inputMode="url" className={inputClass} />
      </Field>
      <Field label="Description" hint="Optional">
        <textarea value={draft.description} onChange={set("description")} rows={2} maxLength={200} placeholder="What it's for" className={textareaClass} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mt-auto flex items-center justify-end gap-[8px] pt-[2px]">
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !draft.name.trim() || !draft.url.trim()} className={btnPrimary}>
          {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
          {mode === "new" ? "Add link" : "Save"}
        </button>
      </div>
    </form>
  );
}
