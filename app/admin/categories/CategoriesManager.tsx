"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, MonitorCog, ServerCog, Tags, Plus, X, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TEAMS } from "@/app/lib/teams";
import type { Category } from "@/app/lib/categories";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const TEAM_STYLE: Record<
  string,
  { border: string; bg: string; icon: string; chip: string; iconEl: LucideIcon }
> = {
  "Application team": {
    border: "border-[color:var(--color-violet)]/25",
    bg: "bg-[color:var(--color-violet-light)]",
    icon: "bg-[color:var(--color-violet)] text-paper",
    chip: "border-[color:var(--color-violet)]/25 bg-white text-[color:var(--color-violet-text)]",
    iconEl: Boxes,
  },
  "System team": {
    border: "border-[color:var(--color-blue)]/25",
    bg: "bg-[color:var(--color-blue-light)]",
    icon: "bg-[color:var(--color-blue)] text-paper",
    chip: "border-[color:var(--color-blue)]/25 bg-white text-[color:var(--color-blue-text)]",
    iconEl: MonitorCog,
  },
  "Admin team": {
    border: "border-result-border",
    bg: "bg-result-bg",
    icon: "bg-primary text-paper",
    chip: "border-result-border bg-white text-primary",
    iconEl: ServerCog,
  },
};

const DEFAULT_STYLE = {
  border: "border-card-border",
  bg: "bg-paper",
  icon: "bg-ink text-paper",
  chip: "border-card-border bg-white text-ink",
  iconEl: Tags,
};

export default function CategoriesManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const teamsPresent = Array.from(new Set(categories.map((c) => c.team)));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add category");
      setCategories((prev) =>
        [...prev, data as Category].sort(
          (a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name)
        )
      );
      setName("");
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${basePath}/api/admin/categories/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete category");
      setCategories((prev) => prev.filter((c) => c.id !== pendingDelete.id));
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
            Add category
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
            <div className="flex flex-wrap items-center gap-[9px]">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                autoFocus
                className="min-w-[220px] flex-1 rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[7.5px] text-[10.5px] text-ink outline-none focus:border-primary"
              />
              <div className="flex flex-wrap items-center gap-[6px]">
                {TEAMS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeam(t)}
                    className={`rounded-full border px-[9px] py-[4.5px] text-[9px] font-semibold transition-colors ${
                      team === t
                        ? "border-primary bg-primary text-paper"
                        : "border-card-border bg-paper text-muted hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-[9px]">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[7.5px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setName("");
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

      <div className="flex flex-col gap-[15px]">
        {teamsPresent.map((teamName) => {
          const items = categories.filter((c) => c.team === teamName);
          const style = TEAM_STYLE[teamName] ?? DEFAULT_STYLE;
          const Icon = style.iconEl;
          return (
            <div
              key={teamName}
              className={`flex flex-col gap-[12px] rounded-[14px] border ${style.border} ${style.bg} px-[18px] py-[16.5px]`}
            >
              <div className="flex items-center gap-[9px]">
                <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] ${style.icon}`}>
                  <Icon size={15} strokeWidth={2.25} />
                </span>
                <div className="flex flex-col">
                  <span className="font-heading text-[13.5px] font-semibold text-ink">{teamName}</span>
                  <span className="text-[9px] text-muted-2">{items.length} categories routed here</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-[7.5px]">
                <AnimatePresence initial={false}>
                  {items.map((c) => (
                    <motion.span
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                      className={`inline-flex items-center gap-[6px] rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${style.chip}`}
                    >
                      {c.name}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(c)}
                        aria-label={`Delete ${c.name}`}
                        className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-faint hover:bg-black/5 hover:text-[color:var(--color-rose-text)]"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                {items.length === 0 && (
                  <span className="text-[9.75px] text-faint">No categories in this team yet.</span>
                )}
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="text-[10.5px] text-faint">No categories yet — add one above to get started.</p>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this category?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will no longer be selectable when submitting new tickets. Existing tickets already using it keep their category as-is.`
            : undefined
        }
        danger
        loading={deleting}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
