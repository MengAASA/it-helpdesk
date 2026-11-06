"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Download,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";
import StatusSteps from "@/app/components/StatusSteps";
import { Detail, DetailGroup } from "@/app/components/DetailList";
import { PriorityBadge, StatusDot } from "@/app/components/TicketBadges";
import AssigneeLookup, { type AssigneeOption } from "./AssigneeLookup";
import type { CannedResponse } from "@/app/lib/cannedResponses";
import { describeEvent } from "@/app/lib/ticketEvents";
import { fileExtLabel, formatFileSize } from "@/app/lib/fileFormat";

const STATUSES = ["Open", "In Progress", "Closed"] as const;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

type Note = {
  id: number;
  authorName: string;
  authorEmail: string;
  message: string;
  isPublic: boolean;
  createdAt: string;
};

type TicketEvent = {
  id: number;
  eventType: string;
  fromValue: string | null;
  toValue: string | null;
  actorName: string;
  createdAt: string;
};

type Attachment = { id: number; filename: string; size: number };

type SaveState = "idle" | "saved" | "error";

export default function TicketWorkspace({
  ticketNumber,
  createdAt,
  initialStatus,
  initialAssignedTo,
  initialNotes,
  initialEvents,
  currentAdminName,
  canManage,
  assigneeOptions,
  cannedResponses,
  message,
  userRequestTypes,
  attachments,
  requesterName,
  requesterStaffId,
  requesterEmail,
  requesterPhone,
  requesterLocation,
  requesterDepartment,
  category,
  team,
  priority,
  submittedLabel,
  feedback,
}: {
  ticketNumber: string;
  createdAt: string;
  initialStatus: string;
  initialAssignedTo: string | null;
  initialNotes: Note[];
  initialEvents: TicketEvent[];
  currentAdminName: string;
  canManage: boolean;
  assigneeOptions: AssigneeOption[];
  cannedResponses: CannedResponse[];
  message: string;
  userRequestTypes: string[];
  attachments: Attachment[];
  requesterName: string;
  requesterStaffId: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterLocation: string;
  requesterDepartment: string;
  category: string;
  team: string;
  priority: string;
  submittedLabel: string;
  feedback: "up" | "down" | null;
}) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const [status, setStatus] = useState(initialStatus);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveState, setStatusSaveState] = useState<SaveState>("idle");
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [savedAssignedTo, setSavedAssignedTo] = useState(initialAssignedTo ?? "");
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [assigneeSaveState, setAssigneeSaveState] = useState<SaveState>("idle");
  const [notes, setNotes] = useState(initialNotes);
  const [events, setEvents] = useState(initialEvents);
  const [noteText, setNoteText] = useState("");
  const [noteIsPublic, setNoteIsPublic] = useState(false);
  const [postingNote, setPostingNote] = useState(false);
  // Entries that were there on load rise in one after another; anything added later appears at once.
  const [loadedKeys] = useState(
    () => new Set([...initialNotes.map((n) => `note-${n.id}`), ...initialEvents.map((e) => `event-${e.id}`)])
  );

  const timeline = useMemo(() => {
    return [
      ...notes.map((n) => ({ kind: "note" as const, key: `note-${n.id}`, createdAt: n.createdAt, data: n })),
      ...events.map((e) => ({ kind: "event" as const, key: `event-${e.id}`, createdAt: e.createdAt, data: e })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [notes, events]);

  const statusEvents = useMemo(
    () =>
      events
        .filter((e) => e.eventType === "status")
        .map((e) => ({ from: e.fromValue, to: e.toValue, at: new Date(e.createdAt) })),
    [events]
  );
  const lastUpdatedAt = timeline.length > 0 ? timeline[timeline.length - 1].createdAt : createdAt;

  async function patchTicket(body: Record<string, string>) {
    const res = await fetch(`${basePath}/api/admin/tickets/${ticketNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error("Failed to update ticket");
    }
  }

  async function handleStatusChange(next: string) {
    const prev = status;
    if (next === prev) return;
    setStatus(next);
    setSavingStatus(true);
    setStatusSaveState("idle");
    try {
      await patchTicket({ status: next });
      setEvents((cur) => [
        ...cur,
        {
          id: Date.now(),
          eventType: "status",
          fromValue: prev,
          toValue: next,
          actorName: currentAdminName,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStatusSaveState("saved");
      setTimeout(() => setStatusSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
      router.refresh();
    } catch {
      setStatus(prev);
      setStatusSaveState("error");
      setTimeout(() => setStatusSaveState((s) => (s === "error" ? "idle" : s)), 3000);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveAssignee() {
    const prev = savedAssignedTo;
    const next = assignedTo.trim();
    setSavingAssignee(true);
    setAssigneeSaveState("idle");
    try {
      await patchTicket({ assignedTo });
      if (next !== prev) {
        setEvents((cur) => [
          ...cur,
          {
            id: Date.now(),
            eventType: "assignment",
            fromValue: prev || null,
            toValue: next || null,
            actorName: currentAdminName,
            createdAt: new Date().toISOString(),
          },
        ]);
        setSavedAssignedTo(next);
      }
      setAssigneeSaveState("saved");
      setTimeout(() => setAssigneeSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
      router.refresh();
    } catch {
      setAssignedTo(prev);
      setAssigneeSaveState("error");
      setTimeout(() => setAssigneeSaveState((s) => (s === "error" ? "idle" : s)), 3000);
    } finally {
      setSavingAssignee(false);
    }
  }

  function handleInsertTemplate(idStr: string) {
    const tpl = cannedResponses.find((c) => String(c.id) === idStr);
    if (!tpl) return;
    const wasEmpty = !noteText.trim();
    setNoteText((prev) => (prev.trim() ? `${prev}\n\n${tpl.body}` : tpl.body));
    if (wasEmpty) setNoteIsPublic(tpl.isPublic);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setPostingNote(true);
    try {
      const res = await fetch(`${basePath}/api/admin/tickets/${ticketNumber}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteText, isPublic: noteIsPublic }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes((prev) => [
          ...prev,
          {
            id: data.id,
            authorName: data.authorName,
            authorEmail: data.authorEmail,
            message: data.message,
            isPublic: data.isPublic,
            createdAt: data.createdAt,
          },
        ]);
        setNoteText("");
        setNoteIsPublic(false);
      }
    } finally {
      setPostingNote(false);
    }
  }

  const isRequester = (email: string) => email.toLowerCase() === requesterEmail.toLowerCase();

  return (
    <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
      {/* Status and owner: the controls an agent reaches for most, in the dark card. */}
      <section
        aria-label="Status and assignee"
        className="tile-ink home-rise relative z-10 flex flex-col gap-[16px] rounded-[16px] p-[16px] [--field-border:rgb(255_255_255/0.12)] [--field-border-hover:rgb(255_255_255/0.24)] lg:col-start-2 lg:row-start-1"
        style={{ "--d": "60ms" } as React.CSSProperties}
      >
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center justify-between gap-[8px]">
            <span className="text-[12px] text-muted-2">Status</span>
            <SaveNote saving={savingStatus} state={statusSaveState} />
          </div>
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-[2px] rounded-[10px] bg-surface-2 p-[3px]">
            {STATUSES.map((s) => {
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={savingStatus || !canManage}
                  onClick={() => handleStatusChange(s)}
                  className={`relative h-[30px] rounded-[7px] text-[12px] font-medium transition-colors disabled:cursor-not-allowed ${
                    active ? "text-[color:var(--navy)]" : "text-muted hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-status-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                    />
                  )}
                  <span className="relative inline-flex items-center justify-center gap-[6px] whitespace-nowrap">
                    <StatusDot status={s} />
                    {s}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <StatusSteps status={status} createdAt={new Date(createdAt)} events={statusEvents} />

        <div className="flex flex-col gap-[8px] border-t border-divider pt-[14px]">
          <div className="flex items-center justify-between gap-[8px]">
            <span className="text-[12px] text-muted-2">Assigned to</span>
            <SaveNote saving={false} state={assigneeSaveState} />
          </div>
          <div className="flex items-center gap-[6px]">
            <AssigneeLookup value={assignedTo} onChange={setAssignedTo} options={assigneeOptions} disabled={!canManage} />
            <button
              type="button"
              disabled={savingAssignee || !canManage}
              onClick={handleSaveAssignee}
              className="inline-flex h-[32px] shrink-0 items-center gap-[6px] whitespace-nowrap rounded-[8px] bg-white px-[12px] text-[13px] font-medium text-[color:var(--navy)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAssignee ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : <Check size={13} strokeWidth={2.25} />}
              {savingAssignee ? "Saving…" : "Save"}
            </button>
          </div>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setAssignedTo(currentAdminName)}
            className="w-fit text-[12px] font-medium text-muted underline decoration-white/20 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-current disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign to me
          </button>
        </div>

        <dl className="flex items-center justify-between gap-[12px] border-t border-divider pt-[14px] text-[13px]">
          <dt className="text-muted-2">Last update</dt>
          <dd className="truncate tabular-nums text-ink">{formatTimestamp(lastUpdatedAt)}</dd>
        </dl>
      </section>

      {/* The whole story in one thread, then the composer. */}
      <section aria-label="Conversation" className="flex min-w-0 flex-col gap-[14px] lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {!canManage && (
          <p className="rounded-[10px] border border-amber-border bg-amber-bg px-[14px] py-[10px] text-[13px] text-amber-text-strong">
            You have read-only access here. Ask an admin for the &quot;Manage tickets&quot; permission to make changes.
          </p>
        )}

        <ol className="relative flex flex-col gap-[14px]">
          <span aria-hidden="true" className="absolute bottom-[14px] left-[13.5px] top-[14px] w-px bg-divider" />

          <li className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={{ "--d": "40ms" } as React.CSSProperties}>
            <Avatar name={requesterName} size={28} />
            <article className="flex flex-col overflow-hidden rounded-[14px] border border-card-border bg-surface">
              <div className="flex flex-wrap items-baseline justify-between gap-x-[10px] gap-y-[2px] px-[16px] pt-[12px]">
                <span className="text-[13px] text-muted-2">
                  <span className="font-semibold text-ink">{requesterName}</span> opened this ticket
                </span>
                <time dateTime={createdAt} className="text-[12px] text-faint">
                  {submittedLabel}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words px-[16px] pb-[14px] pt-[8px] text-[13px] leading-[21px] text-ink">{message}</p>
              {userRequestTypes.length > 0 && (
                <div className="flex flex-wrap gap-[4px] px-[16px] pb-[14px]">
                  {userRequestTypes.map((r) => (
                    <span key={r} className="inline-flex h-[22px] items-center rounded-full bg-surface-2 px-[8px] text-[12px] text-ink">
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <div className="flex flex-col gap-[8px] border-t border-divider bg-surface-2/40 px-[16px] py-[12px]">
                  <span className="text-[12px] font-medium text-muted-2">
                    {attachments.length} {attachments.length === 1 ? "file" : "files"} on this ticket
                  </span>
                  <ul className="grid grid-cols-1 gap-[6px] sm:grid-cols-2">
                    {attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={`${basePath}/api/attachments/${a.id}`}
                          className="group flex items-center gap-[10px] rounded-[10px] border border-card-border bg-surface p-[6px] pr-[10px] transition-colors hover:border-field-border-hover"
                        >
                          <span className="flex h-[30px] w-[38px] shrink-0 items-center justify-center rounded-[6px] bg-ink text-[11px] font-semibold tracking-[0.02em] text-paper">
                            {fileExtLabel(a.filename)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13px] font-medium text-ink" title={a.filename}>
                              {a.filename}
                            </span>
                            <span className="text-[11px] text-muted-2">{formatFileSize(a.size)}</span>
                          </span>
                          <Download
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-faint transition-[color,transform] duration-200 group-hover:translate-y-[1px] group-hover:text-ink"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </li>

          {timeline.map((item, i) => {
            const style = { "--d": loadedKeys.has(item.key) ? `${Math.min(100 + i * 40, 420)}ms` : "0ms" } as React.CSSProperties;
            if (item.kind === "event") {
              const e = item.data;
              return (
                <li key={item.key} className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] items-center gap-[12px]" style={style}>
                  <span className="flex justify-center">
                    <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-paper text-muted-2 ring-1 ring-card-border">
                      <EventMark event={e} />
                    </span>
                  </span>
                  <p className="flex flex-wrap items-baseline gap-x-[6px] text-[12px] text-muted-2">
                    <span>
                      <span className="font-medium text-ink">{e.actorName}</span> {describeEvent(e)}
                    </span>
                    <time dateTime={e.createdAt} className="text-faint">
                      · {formatTimestamp(e.createdAt)}
                    </time>
                  </p>
                </li>
              );
            }
            const n = item.data;
            const fromRequester = isRequester(n.authorEmail);
            const tone = fromRequester
              ? "bg-primary-soft"
              : n.isPublic
                ? "border border-card-border bg-surface"
                : "border border-amber-border bg-amber-bg";
            return (
              <li key={item.key} className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={style}>
                <Avatar name={n.authorName} size={28} />
                <article className={`flex flex-col gap-[6px] rounded-[14px] px-[16px] py-[12px] ${tone}`}>
                  <div className="flex flex-wrap items-center justify-between gap-x-[10px] gap-y-[2px]">
                    <span className="inline-flex flex-wrap items-center gap-[6px] text-[13px] font-semibold text-ink">
                      {n.authorName}
                      {fromRequester ? (
                        <Tag className="bg-surface text-primary">Requester</Tag>
                      ) : n.isPublic ? (
                        <Tag className="bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]">
                          <Eye size={11} strokeWidth={2} />
                          Visible to requester
                        </Tag>
                      ) : (
                        <Tag className="bg-surface text-amber-text-strong">
                          <EyeOff size={11} strokeWidth={2} />
                          Internal
                        </Tag>
                      )}
                    </span>
                    <time dateTime={n.createdAt} className="text-[12px] text-faint">
                      {formatTimestamp(n.createdAt)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-[21px] text-ink">{n.message}</p>
                </article>
              </li>
            );
          })}
        </ol>

        {canManage && (
          <div className="home-rise mt-[4px] grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={{ "--d": "300ms" } as React.CSSProperties}>
            <Avatar name={currentAdminName || "IT"} size={28} />
            <form
              onSubmit={handleAddNote}
              className={`flex min-w-0 flex-col overflow-hidden rounded-[14px] border transition-[border-color,box-shadow,background-color] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_14%,transparent)] ${
                noteIsPublic ? "border-card-border bg-surface focus-within:border-primary/50" : "border-amber-border bg-amber-bg"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-[8px] px-[8px] pt-[8px]">
                <div role="radiogroup" aria-label="Who can see this" className="inline-flex rounded-[8px] bg-ink/[0.05] p-[2px]">
                  <ModeButton active={noteIsPublic} onClick={() => setNoteIsPublic(true)} icon={<Eye size={13} strokeWidth={2} />}>
                    Reply to requester
                  </ModeButton>
                  <ModeButton active={!noteIsPublic} onClick={() => setNoteIsPublic(false)} icon={<EyeOff size={13} strokeWidth={2} />}>
                    Internal note
                  </ModeButton>
                </div>
                {cannedResponses.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => handleInsertTemplate(e.target.value)}
                    aria-label="Insert a canned response"
                    className="h-[28px] max-w-[200px] rounded-[8px] border border-field-border bg-surface px-[8px] text-[12px] text-muted outline-none transition-colors hover:border-field-border-hover"
                  >
                    <option value="" disabled>
                      Insert template…
                    </option>
                    {cannedResponses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <label htmlFor="admin-note" className="sr-only">
                {noteIsPublic ? "Reply to the requester" : "Internal note"}
              </label>
              <textarea
                id="admin-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={3}
                placeholder={noteIsPublic ? "Write a reply the requester will see…" : "Add an internal note…"}
                className="field-bare block min-h-[84px] w-full resize-y bg-transparent px-[16px] pb-[8px] pt-[10px] text-[13px] leading-[21px] text-ink outline-none placeholder:text-faint"
              />
              <div className={`flex items-center gap-[8px] border-t p-[8px] pl-[16px] ${noteIsPublic ? "border-divider" : "border-amber-border"}`}>
                <span className={`min-w-0 truncate text-[12px] ${noteIsPublic ? "text-muted-2" : "text-amber-text-strong"}`}>
                  {noteIsPublic ? "The requester will see this on their ticket." : "Only IT staff can see this."}
                </span>
                <span className="ml-auto hidden shrink-0 text-[11px] text-faint md:inline">Ctrl / ⌘ + Enter</span>
                <button
                  type="submit"
                  disabled={postingNote || !noteText.trim()}
                  className="group ml-auto inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] bg-ink px-[12px] text-[13px] font-medium text-paper transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 md:ml-0"
                >
                  {postingNote ? "Posting…" : noteIsPublic ? "Send reply" : "Add note"}
                  <Send
                    size={13}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-enabled:group-hover:-translate-y-[1px] group-enabled:group-hover:translate-x-[1px]"
                  />
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <aside
        aria-label="Ticket details"
        className="home-rise flex flex-col gap-[16px] rounded-[14px] border border-card-border bg-surface p-[16px] lg:col-start-2 lg:row-start-2 lg:self-start"
        style={{ "--d": "140ms" } as React.CSSProperties}
      >
        <DetailGroup title="Ticket">
          <Detail label="Category" value={category} />
          <Detail label="Team" value={team} />
          <Detail label="Priority">
            <PriorityBadge priority={priority} />
          </Detail>
          <Detail label="Submitted" value={submittedLabel} />
          <Detail label="Feedback">
            {feedback === "up" ? (
              <span className="inline-flex items-center gap-[6px] text-[color:var(--color-emerald-text)]">
                <ThumbsUp size={13} strokeWidth={2} /> Resolved
              </span>
            ) : feedback === "down" ? (
              <span className="inline-flex items-center gap-[6px] text-[color:var(--color-rose-text)]">
                <ThumbsDown size={13} strokeWidth={2} /> Not resolved
              </span>
            ) : (
              <span className="text-faint">No answer yet</span>
            )}
          </Detail>
        </DetailGroup>
        <div className="h-px bg-divider" />
        <DetailGroup title="Requester">
          <Detail label="Name" value={requesterName} />
          <Detail label="Staff ID" value={requesterStaffId} />
          <Detail label="Email">
            <a href={`mailto:${requesterEmail}`} className="text-ink underline decoration-card-border underline-offset-[3px] transition-colors hover:decoration-current">
              {requesterEmail}
            </a>
          </Detail>
          <Detail label="Phone">
            <a href={`tel:${requesterPhone.replace(/[^\d+]/g, "")}`} className="tabular-nums text-ink underline decoration-card-border underline-offset-[3px] transition-colors hover:decoration-current">
              {requesterPhone}
            </a>
          </Detail>
          <Detail label="Location" value={requesterLocation} />
          <Detail label="Department" value={requesterDepartment} />
        </DetailGroup>
      </aside>
    </div>
  );
}

/** "Saving…", "Saved" or "Failed to save" beside a control in the dark card, fading in and out. */
function SaveNote({ saving, state }: { saving: boolean; state: SaveState }) {
  const key = saving ? "saving" : state;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {key !== "idle" && (
        <motion.span
          key={key}
          role="status"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`inline-flex items-center gap-[4px] text-[12px] font-medium ${
            key === "saved" ? "text-lime-bright" : key === "error" ? "text-chart-pink" : "text-muted-2"
          }`}
        >
          {key === "saving" && <Loader2 size={12} strokeWidth={2.25} className="animate-spin" />}
          {key === "saved" && <Check size={12} strokeWidth={2.5} />}
          {key === "error" && <AlertCircle size={12} strokeWidth={2.25} />}
          {key === "saving" ? "Saving…" : key === "saved" ? "Saved" : "Failed to save"}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function EventMark({ event: e }: { event: TicketEvent }) {
  if (e.eventType === "status") return <StatusDot status={e.toValue ?? ""} />;
  if (e.eventType === "assignment") return <UserRound size={10} strokeWidth={2.25} />;
  if (e.eventType === "feedback")
    return e.toValue === "up" ? <ThumbsUp size={9} strokeWidth={2.25} /> : <ThumbsDown size={9} strokeWidth={2.25} />;
  if (e.eventType === "priority") return <Flag size={9} strokeWidth={2.25} />;
  return <AlertCircle size={10} strokeWidth={2.25} />;
}

function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-[20px] items-center gap-[4px] rounded-[5px] px-[6px] text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`relative inline-flex h-[26px] items-center gap-[6px] rounded-[6px] px-[10px] text-[12px] font-medium transition-colors ${
        active ? "text-ink" : "text-muted-2 hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="note-mode-pill"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-[6px] bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
        />
      )}
      <span className="relative inline-flex items-center gap-[6px]">
        {icon}
        {children}
      </span>
    </button>
  );
}
