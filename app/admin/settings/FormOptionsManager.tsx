"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, Pencil, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import {
  FORM_OPTION_LISTS,
  LIST_META,
  OPTION_LABEL_MAX,
  OPTION_LIST_MAX,
  cleanOptionList,
  type FormOptionList,
  type FormOptions,
} from "@/app/lib/formOptions";
import { Flash, Notice, Panel, PanelFooter, PanelHeader, btnGhost, btnPrimary, btnSecondary, iconBtn, inputClass } from "./settingsParts";

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const clean = (v: string) => v.trim().replace(/\s+/g, " ");

/**
 * Settings → Form options: the location, department and request type choices on the ticket form.
 * Edits stay as a draft per list until Save, which sends every changed list.
 */
export default function FormOptionsManager({ initialOptions }: { initialOptions: FormOptions }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [saved, setSaved] = useState<FormOptions>(initialOptions);
  const [drafts, setDrafts] = useState<FormOptions>(initialOptions);
  const [active, setActive] = useState<FormOptionList>("department");
  const [newLabel, setNewLabel] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const items = drafts[active];
  const meta = LIST_META[active];
  const dirtyLists = FORM_OPTION_LISTS.filter((l) => !sameList(drafts[l], saved[l]));
  const q = filter.trim().toLowerCase();
  const filtering = q.length > 0;
  const visible = items.map((label, index) => ({ label, index })).filter((x) => !filtering || x.label.toLowerCase().includes(q));

  function setItems(next: string[]) {
    setDrafts((d) => ({ ...d, [active]: next }));
    setError(null);
    setJustSaved(false);
  }

  function isTaken(label: string, exceptIndex?: number) {
    const k = label.toLowerCase();
    return items.some((v, i) => i !== exceptIndex && v.toLowerCase() === k);
  }

  function switchList(list: FormOptionList) {
    setActive(list);
    setEditing(null);
    setFilter("");
    setNewLabel("");
    setError(null);
  }

  function add() {
    const label = clean(newLabel);
    if (!label) return;
    if (isTaken(label)) return setError(`"${label}" is already in the list`);
    if (items.length >= OPTION_LIST_MAX) return setError(`At most ${OPTION_LIST_MAX} ${meta.label.toLowerCase()}`);
    setItems([...items, label]);
    setNewLabel("");
  }

  function commitEdit() {
    if (!editing) return;
    const label = clean(editing.value);
    if (!label) return setError("A name can't be empty. Use the bin to remove it instead.");
    if (isTaken(label, editing.index)) return setError(`"${label}" is already in the list`);
    setItems(items.map((v, i) => (i === editing.index ? label : v)));
    setEditing(null);
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(next);
  }

  async function save() {
    for (const l of dirtyLists) {
      const c = cleanOptionList(l, drafts[l]);
      if (!c.ok) {
        switchList(l);
        return setError(c.error);
      }
    }
    setSaving(true);
    setError(null);
    try {
      const next = { ...saved };
      for (const l of dirtyLists) {
        const res = await fetch(`${basePath}/api/admin/form-options`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ list: l, options: drafts[l] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Could not save ${LIST_META[l].label.toLowerCase()}`);
        next[l] = data.options;
        setSaved({ ...next });
      }
      setDrafts(next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDrafts(saved);
    setEditing(null);
    setError(null);
  }

  return (
    <Panel>
      <PanelHeader
        title="Form options"
        description="The choices people pick from on the ticket form. Changes apply to new tickets as soon as you save; tickets already filed keep what was picked."
      />

      <div className="flex flex-col gap-[14px] border-t border-card-border/60 px-[20px] py-[18px]">
        {/* Which list. A dot marks lists with unsaved changes. */}
        <div
          role="tablist"
          aria-label="Lists"
          className="flex h-[32px] w-full items-center rounded-[9px] border border-field-border bg-surface-2 p-[2px] @min-[640px]:inline-flex @min-[640px]:w-fit"
        >
          {FORM_OPTION_LISTS.map((l) => {
            const on = l === active;
            const dirty = dirtyLists.includes(l);
            return (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchList(l)}
                className={`relative flex h-[26px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[7px] px-[6px] text-[13px] transition-colors @min-[640px]:flex-none @min-[640px]:px-[10px] ${
                  on ? "text-ink" : "text-muted-2 hover:text-ink"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="form-options-tab"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-[7px] bg-surface shadow-card"
                  />
                )}
                <span className="relative flex items-center gap-[6px]">
                  {LIST_META[l].label}
                  <span className={`hidden text-[12px] tabular-nums @min-[640px]:inline ${on ? "text-muted-2" : "text-faint"}`}>{drafts[l].length}</span>
                  {dirty && <span className="h-[6px] w-[6px] rounded-full bg-amber-solid" aria-label="unsaved changes" />}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[12px] leading-[18px] text-muted-2">{meta.description}</p>

        <div className="flex flex-col gap-[8px] @min-[640px]:flex-row">
          <form
            className="flex min-w-0 flex-1 gap-[8px]"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={OPTION_LABEL_MAX}
              placeholder={`Add a ${meta.singular}`}
              aria-label={`New ${meta.singular}`}
              className={inputClass}
            />
            <button type="submit" disabled={!clean(newLabel)} className={btnSecondary}>
              <Plus size={14} strokeWidth={2} />
              Add
            </button>
          </form>
          {items.length > 8 && (
            <label className="relative flex @min-[640px]:w-[220px]">
              <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find in list"
                aria-label={`Find ${meta.label.toLowerCase()}`}
                className={`${inputClass} pl-[30px]`}
              />
            </label>
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {items.length === 0 ? (
          <p className="rounded-[10px] bg-surface-2/60 px-[12px] py-[16px] text-center text-[13px] text-muted-2">
            {meta.required ? `No ${meta.label.toLowerCase()} yet. Add at least one before saving.` : "Empty, so the form won't ask this question."}
          </p>
        ) : visible.length === 0 ? (
          <p className="px-[12px] py-[16px] text-center text-[13px] text-muted-2">Nothing matches &ldquo;{filter.trim()}&rdquo;.</p>
        ) : (
          <Reorder.Group
            as="ol"
            axis="y"
            values={items}
            onReorder={(next) => !filtering && setItems(next)}
            className="flex flex-col rounded-[12px] border border-card-border/70"
          >
            {visible.map(({ label, index }) => (
              <OptionRow
                key={label}
                label={label}
                index={index}
                count={items.length}
                isNew={!saved[active].includes(label)}
                canDrag={!filtering}
                editing={editing?.index === index ? editing.value : null}
                onEditStart={() => {
                  setEditing({ index, value: label });
                  setError(null);
                }}
                onEditChange={(value) => setEditing({ index, value })}
                onEditCommit={commitEdit}
                onEditCancel={() => setEditing(null)}
                onMove={(by) => move(index, by)}
                onRemove={() => setItems(items.filter((_, i) => i !== index))}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      <PanelFooter
        status={
          <>
            <Flash show={justSaved} tone="ok">
              Saved
            </Flash>
            {!justSaved && dirtyLists.length > 0 && (
              <span className="text-[13px] text-muted-2">
                Unsaved changes in {dirtyLists.map((l) => LIST_META[l].label.toLowerCase()).join(" and ")}
              </span>
            )}
          </>
        }
      >
        {dirtyLists.length > 0 && (
          <button type="button" onClick={discard} disabled={saving} className={btnGhost}>
            <Undo2 size={14} strokeWidth={1.75} />
            Discard
          </button>
        )}
        <button type="button" onClick={save} disabled={saving || dirtyLists.length === 0} className={btnPrimary}>
          {saving && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </PanelFooter>
    </Panel>
  );
}

function OptionRow({
  label,
  index,
  count,
  isNew,
  canDrag,
  editing,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onMove,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  isNew: boolean;
  canDrag: boolean;
  editing: string | null;
  onEditStart: () => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={label}
      dragListener={false}
      dragControls={controls}
      className="group relative flex min-h-[40px] items-center gap-[8px] border-b border-card-border/60 bg-surface px-[8px] text-[13px] first:rounded-t-[12px] last:rounded-b-[12px] last:border-b-0"
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px rgba(15,23,42,0.14)", zIndex: 5 }}
    >
      <button
        type="button"
        aria-label={`Drag ${label} to reorder`}
        title={canDrag ? "Drag to reorder" : "Clear the search to reorder"}
        disabled={!canDrag}
        onPointerDown={(e) => canDrag && controls.start(e)}
        className="flex h-[28px] w-[20px] shrink-0 cursor-grab touch-none items-center justify-center text-faint hover:text-ink active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical size={14} strokeWidth={1.75} />
      </button>
      <span className="w-[24px] shrink-0 text-right text-[12px] tabular-nums text-faint">{index + 1}</span>

      {editing !== null ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-[6px] py-[4px]"
          onSubmit={(e) => {
            e.preventDefault();
            onEditCommit();
          }}
        >
          <input
            autoFocus
            value={editing}
            maxLength={OPTION_LABEL_MAX}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onEditCancel()}
            aria-label={`Rename ${label}`}
            className={inputClass}
          />
          <button type="submit" aria-label="Keep new name" className={iconBtn}>
            <Check size={14} strokeWidth={2} />
          </button>
          <button type="button" onClick={onEditCancel} aria-label="Cancel rename" className={iconBtn}>
            <X size={14} strokeWidth={2} />
          </button>
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1 break-words py-[8px] text-ink">{label}</span>
          {isNew && <span className="shrink-0 rounded-[5px] bg-primary-soft px-[6px] py-[1px] text-[11px] font-medium text-primary">New</span>}
          <span className="flex shrink-0 items-center opacity-100 transition-opacity duration-150 @min-[640px]:opacity-0 @min-[640px]:group-focus-within:opacity-100 @min-[640px]:group-hover:opacity-100">
            <span className="hidden items-center @min-[640px]:flex">
              <button type="button" onClick={() => onMove(-1)} disabled={index === 0 || !canDrag} aria-label={`Move ${label} up`} className={`${iconBtn} disabled:opacity-30`}>
                <ArrowUp size={14} strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => onMove(1)} disabled={index === count - 1 || !canDrag} aria-label={`Move ${label} down`} className={`${iconBtn} disabled:opacity-30`}>
                <ArrowDown size={14} strokeWidth={1.75} />
              </button>
            </span>
            <button type="button" onClick={onEditStart} aria-label={`Rename ${label}`} className={iconBtn}>
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className={`${iconBtn} hover:bg-rose-light hover:text-rose-text`}>
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </span>
        </>
      )}
    </Reorder.Item>
  );
}
