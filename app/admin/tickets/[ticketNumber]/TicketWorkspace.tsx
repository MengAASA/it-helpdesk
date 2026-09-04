"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Send,
  Eye,
  EyeOff,
  History,
  UserRound,
  Tag,
  Users2,
  IdCard,
  Mail,
  Phone,
  MapPin,
  Building2,
  Clock,
  Flag,
  Paperclip,
  ListChecks,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";
import AssigneeLookup, { type AssigneeOption } from "./AssigneeLookup";
import type { CannedResponse } from "@/app/lib/cannedResponses";

const STATUSES = ["Open", "In Progress", "Closed"] as const;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
}

const STATUS_BTN_STYLES: Record<string, string> = {
  Open: "border-[color:var(--color-blue)] bg-[color:var(--color-blue)] text-paper",
  "In Progress": "border-[color:var(--color-amber-solid)] bg-[color:var(--color-amber-solid)] text-paper",
  Closed: "border-[color:var(--color-emerald)] bg-[color:var(--color-emerald)] text-paper",
};

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/25 bg-[color:var(--color-rose-light)] text-[color:var(--color-rose-text)]",
  Normal: "border-pill-border bg-pill-bg text-pill-text",
  Low: "border-[color:var(--color-emerald)]/25 bg-[color:var(--color-emerald-light)] text-[color:var(--color-emerald-text)]",
};

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

function describeEvent(e: TicketEvent): string {
  if (e.eventType === "status") {
    return `changed status from ${e.fromValue ?? "—"} to ${e.toValue ?? "—"}`;
  }
  if (e.eventType === "assignment") {
    if (!e.fromValue) return `assigned ticket to ${e.toValue}`;
    if (!e.toValue) return `unassigned ticket (was ${e.fromValue})`;
    return `reassigned ticket from ${e.fromValue} to ${e.toValue}`;
  }
  if (e.eventType === "feedback") {
    return e.toValue === "up" ? "marked this ticket as resolved 👍" : "marked this ticket as not resolved 👎";
  }
  return e.eventType;
}

type Attachment = { id: number; filename: string; size: number };

export default function TicketWorkspace({
  ticketNumber,
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
  const [statusSaveState, setStatusSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [savedAssignedTo, setSavedAssignedTo] = useState(initialAssignedTo ?? "");
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [assigneeSaveState, setAssigneeSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [notes, setNotes] = useState(initialNotes);
  const [events, setEvents] = useState(initialEvents);
  const [noteText, setNoteText] = useState("");
  const [noteIsPublic, setNoteIsPublic] = useState(false);
  const [postingNote, setPostingNote] = useState(false);

  const timeline = useMemo(() => {
    return [
      ...notes.map((n) => ({ kind: "note" as const, key: `note-${n.id}`, createdAt: n.createdAt, data: n })),
      ...events.map((e) => ({ kind: "event" as const, key: `event-${e.id}`, createdAt: e.createdAt, data: e })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [notes, events]);

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

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_290px] lg:items-start">
      {/* Conversation */}
      <div className="flex flex-col gap-[15px]">
        {!canManage && (
          <div className="rounded-[7.5px] border border-amber-border bg-amber-bg px-[12px] py-[9px] text-[9.75px] text-amber-text-strong">
            You have read-only access here. Ask an admin to grant you the &quot;Manage tickets&quot; permission to make changes.
          </div>
        )}

        <div className="flex flex-col gap-[10.5px] rounded-[12px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-[9px]">
            <Avatar name={requesterName} size={27} />
            <div className="flex flex-col gap-[0px]">
              <span className="text-[10.5px] font-semibold text-ink">{requesterName}</span>
              <span className="text-[8.5px] text-faint">{submittedLabel}</span>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-[11.25px] leading-[1.6] text-ink">{message}</p>

          {userRequestTypes.length > 0 && (
            <div className="flex flex-wrap gap-[6px] pt-[3px]">
              {userRequestTypes.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-[4px] rounded-full border border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] px-[9px] py-[4.5px] text-[9px] font-semibold text-[color:var(--color-violet-text)]"
                >
                  <ListChecks size={9} strokeWidth={2.5} />
                  {r}
                </span>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-[7.5px] border-t border-divider pt-[10.5px]">
              {attachments.map((a) => (
                <a
                  key={a.id}
                  href={`${basePath}/api/attachments/${a.id}`}
                  className="inline-flex items-center gap-[6px] rounded-full border border-card-border bg-paper px-[10.5px] py-[6px] text-[9.75px] text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Paperclip size={11} strokeWidth={2.25} className="text-faint" />
                  {a.filename}
                  <span className="text-faint">({Math.ceil(a.size / 1024)} KB)</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[9px] rounded-[12px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
            Activity ({timeline.length})
          </span>
          <div className="flex flex-col gap-[9px]">
            <AnimatePresence initial={false}>
              {timeline.map((item) =>
                item.kind === "note" ? (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="flex gap-[9px]"
                  >
                    <Avatar name={item.data.authorName} size={24} />
                    <div
                      className={`flex flex-1 flex-col gap-[1.5px] rounded-[10px] border-l-[3px] px-[12px] py-[9px] ${
                        item.data.isPublic
                          ? "border-l-[color:var(--color-emerald)] bg-[color:var(--color-emerald-light)]/40"
                          : "border-l-card-border bg-paper"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-[9px]">
                        <span className="inline-flex items-center gap-[6px]">
                          <span className="text-[9.75px] font-semibold text-ink">{item.data.authorName}</span>
                          <span
                            className={`inline-flex items-center gap-[3px] rounded-full border px-[6px] py-[1.5px] text-[8px] font-semibold uppercase tracking-[0.04em] ${
                              item.data.isPublic
                                ? "border-[color:var(--color-emerald)]/30 bg-white text-[color:var(--color-emerald-text)]"
                                : "border-card-border bg-white text-muted-2"
                            }`}
                          >
                            {item.data.isPublic ? <Eye size={9} strokeWidth={2.5} /> : <EyeOff size={9} strokeWidth={2.5} />}
                            {item.data.isPublic ? "Visible to requester" : "Internal"}
                          </span>
                        </span>
                        <span className="text-[8.5px] text-faint">{formatTimestamp(item.data.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[10.5px] leading-[1.5] text-muted">{item.data.message}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center gap-[9px] pl-[3px]"
                  >
                    <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-pill-bg text-muted-2">
                      {item.data.eventType === "assignment" ? (
                        <UserRound size={12} strokeWidth={2.25} />
                      ) : item.data.eventType === "feedback" ? (
                        item.data.toValue === "up" ? (
                          <ThumbsUp size={12} strokeWidth={2.25} />
                        ) : (
                          <ThumbsDown size={12} strokeWidth={2.25} />
                        )
                      ) : (
                        <History size={12} strokeWidth={2.25} />
                      )}
                    </span>
                    <span className="inline-flex flex-1 flex-wrap items-center gap-[4.5px] text-[9.75px] text-muted">
                      <span className="font-semibold text-ink">{item.data.actorName}</span>
                      {describeEvent(item.data)}
                    </span>
                    <span className="whitespace-nowrap text-[8.5px] text-faint">{formatTimestamp(item.data.createdAt)}</span>
                  </motion.div>
                )
              )}
            </AnimatePresence>
            {timeline.length === 0 && <span className="text-[10.5px] text-faint">No activity yet.</span>}
          </div>
          {canManage && (
            <form onSubmit={handleAddNote} className="flex flex-col gap-[7.5px] border-t border-divider pt-[13.5px]">
              {cannedResponses.length > 0 && (
                <select
                  value=""
                  onChange={(e) => handleInsertTemplate(e.target.value)}
                  className="w-fit rounded-[7.5px] border border-card-border bg-paper px-[9px] py-[6px] text-[9.75px] text-muted outline-none focus:border-primary"
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
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                placeholder={noteIsPublic ? "Write a reply the requester will see…" : "Add an internal note…"}
                className="w-full resize-y rounded-[7.5px] border border-card-border bg-paper px-[10.5px] py-[8px] text-[10.5px] text-ink outline-none focus:border-primary"
              />
              <div className="flex items-center justify-between gap-[9px]">
                <label className="inline-flex cursor-pointer items-center gap-[7.5px] text-[9.75px] font-medium text-muted">
                  <input
                    type="checkbox"
                    checked={noteIsPublic}
                    onChange={(e) => setNoteIsPublic(e.target.checked)}
                    className="h-[12px] w-[12px] accent-[color:var(--color-emerald)]"
                  />
                  <span className="inline-flex items-center gap-[4.5px]">
                    {noteIsPublic ? (
                      <Eye size={11} strokeWidth={2.25} className="text-[color:var(--color-emerald-text)]" />
                    ) : (
                      <EyeOff size={11} strokeWidth={2.25} />
                    )}
                    Visible to requester
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={postingNote || !noteText.trim()}
                  className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-admin-gradient px-[13.5px] py-[8px] text-[9.75px] font-semibold text-paper disabled:opacity-60"
                >
                  <Send size={12} strokeWidth={2.25} />
                  {postingNote ? "Posting…" : "Add note"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-[12px] lg:sticky lg:top-[84px]">
        <div className="flex flex-col gap-[6px] rounded-[12px] border border-card-border bg-white px-[15px] py-[13.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-[9px]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">Status</span>
            {savingStatus && (
              <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-muted-2">
                <Loader2 size={10.5} strokeWidth={2.5} className="animate-spin" />
                Saving…
              </span>
            )}
            {!savingStatus && statusSaveState === "saved" && (
              <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-[color:var(--color-emerald-text)]">
                <Check size={10.5} strokeWidth={2.5} />
                Saved
              </span>
            )}
            {!savingStatus && statusSaveState === "error" && (
              <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-[color:var(--color-rose-text)]">
                <AlertCircle size={10.5} strokeWidth={2.5} />
                Failed to save
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-[6px]">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={savingStatus || !canManage}
                onClick={() => handleStatusChange(s)}
                className={`rounded-full border px-[10.5px] py-[5.25px] text-[9.75px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  status === s
                    ? STATUS_BTN_STYLES[s]
                    : "border-card-border bg-paper text-muted hover:border-primary/40 hover:text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[6px] rounded-[12px] border border-card-border bg-white px-[15px] py-[13.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-[9px]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">Assigned to</span>
            {!savingAssignee && assigneeSaveState === "saved" && (
              <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-[color:var(--color-emerald-text)]">
                <Check size={10.5} strokeWidth={2.5} />
                Saved
              </span>
            )}
            {!savingAssignee && assigneeSaveState === "error" && (
              <span className="inline-flex items-center gap-[4.5px] text-[9px] font-medium text-[color:var(--color-rose-text)]">
                <AlertCircle size={10.5} strokeWidth={2.5} />
                Failed to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-[6px]">
            <AssigneeLookup
              value={assignedTo}
              onChange={setAssignedTo}
              options={assigneeOptions}
              disabled={!canManage}
            />
            <button
              type="button"
              disabled={savingAssignee || !canManage}
              onClick={handleSaveAssignee}
              className="inline-flex shrink-0 items-center gap-[4.5px] whitespace-nowrap rounded-[7.5px] bg-ink px-[10.5px] py-[6px] text-[9.75px] font-semibold text-paper transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAssignee ? (
                <Loader2 size={11} strokeWidth={2.5} className="animate-spin" />
              ) : (
                <Check size={11} strokeWidth={2.5} />
              )}
              {savingAssignee ? "Saving…" : "Save"}
            </button>
          </div>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setAssignedTo(currentAdminName)}
            className="w-fit text-[9px] font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Assign to me
          </button>
        </div>

        <div className="flex flex-col items-center gap-[9px] rounded-[12px] border border-card-border bg-white px-[15px] py-[16.5px] text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Avatar name={requesterName} size={39} />
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[11.25px] font-semibold text-ink">{requesterName}</span>
            <span className="text-[9px] text-faint">Requester</span>
          </div>
          <div className="flex w-full flex-col divide-y divide-divider border-t border-divider pt-[6px]">
            <DetailRow icon={IdCard} label="Staff No" value={requesterStaffId} />
            <DetailRow icon={Mail} label="Email" value={requesterEmail} />
            <DetailRow icon={Phone} label="Phone" value={requesterPhone} />
            <DetailRow icon={MapPin} label="Location" value={requesterLocation} />
            <DetailRow icon={Building2} label="Department" value={requesterDepartment} />
          </div>
        </div>

        <div className="flex flex-col divide-y divide-divider rounded-[12px] border border-card-border bg-white px-[15px] py-[6px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <DetailRow icon={Tag} label="Category" value={category} />
          <DetailRow icon={Users2} label="Routed to" value={team} />
          <DetailRow
            icon={Flag}
            label="Priority"
            value={
              <span
                className={`rounded-full border px-[7.5px] py-[2.25px] text-[8.5px] font-semibold ${
                  PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Normal
                }`}
              >
                {priority}
              </span>
            }
          />
          <DetailRow icon={Clock} label="Submitted" value={submittedLabel} />
          <DetailRow
            icon={feedback === "down" ? ThumbsDown : ThumbsUp}
            label="Feedback"
            value={
              feedback === "up" ? (
                <span className="inline-flex items-center gap-[4.5px] text-[color:var(--color-emerald-text)]">
                  <ThumbsUp size={11} strokeWidth={2.25} /> Resolved
                </span>
              ) : feedback === "down" ? (
                <span className="inline-flex items-center gap-[4.5px] text-[color:var(--color-rose-text)]">
                  <ThumbsDown size={11} strokeWidth={2.25} /> Not resolved
                </span>
              ) : (
                <span className="text-faint">—</span>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-[9px] py-[7.5px]">
      <span className="inline-flex shrink-0 items-center gap-[5px] text-[8.5px] font-semibold uppercase tracking-[0.04em] text-muted-2">
        <Icon size={10.5} strokeWidth={2.25} />
        {label}
      </span>
      <span className="truncate text-[10.5px] font-medium text-ink" title={typeof value === "string" ? value : undefined}>
        {value}
      </span>
    </div>
  );
}
