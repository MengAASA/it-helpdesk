import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Hash,
  Tag,
  Users2,
  Clock,
  Paperclip,
  MessageSquareText,
  ListChecks,
  IdCard,
  Mail,
  Phone,
  MapPin,
  Building2,
  UserCog,
  History,
} from "lucide-react";
import { prisma } from "@/app/lib/db";
import Avatar from "@/app/components/Avatar";
import TicketFeedback from "./TicketFeedback";
import TicketReplyForm from "./TicketReplyForm";
import CopyButton from "./CopyButton";

function formatTimestamp(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_DOT: Record<string, string> = {
  Open: "bg-[color:var(--color-blue)]",
  "In Progress": "bg-amber-solid",
  Closed: "bg-[color:var(--color-emerald)]",
};

const STATUS_TEXT: Record<string, string> = {
  Open: "text-[color:var(--color-blue-text)]",
  "In Progress": "text-amber-text-strong",
  Closed: "text-[color:var(--color-emerald-text)]",
};

const PRIORITY_DOT: Record<string, string> = {
  High: "bg-[color:var(--color-rose)]",
  Normal: "bg-[color:var(--color-blue)]/50",
  Low: "bg-[color:var(--color-emerald)]/60",
};

const PRIORITY_TEXT: Record<string, string> = {
  High: "text-[color:var(--color-rose-text)]",
  Normal: "text-pill-text",
  Low: "text-[color:var(--color-emerald-text)]",
};

export async function generateMetadata({
  params,
}: PageProps<"/tickets/[ticketNumber]">): Promise<Metadata> {
  const { ticketNumber } = await params;
  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { subject: true },
  });
  if (!ticket) return { title: "Ticket not found" };
  return { title: `${ticketNumber} · ${ticket.subject}` };
}

export default async function PublicTicketDetail({
  params,
}: PageProps<"/tickets/[ticketNumber]">) {
  const { ticketNumber } = await params;

  const ticket = await prisma.tickets.findUnique({ where: { ticket_number: ticketNumber } });
  if (!ticket) notFound();

  const attachments = await prisma.attachments.findMany({
    where: { ticket_id: ticket.id },
    select: { id: true, filename: true, size: true },
  });
  const replies = await prisma.ticket_notes.findMany({
    where: { ticket_id: ticket.id, is_public: true },
    orderBy: { created_at: "asc" },
  });
  const statusEvents = await prisma.ticket_events.findMany({
    where: { ticket_id: ticket.id, event_type: "status" },
    orderBy: { created_at: "asc" },
  });
  const userRequestTypes = JSON.parse(ticket.user_request_types) as string[];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const activity = [
    { label: "Ticket submitted", at: ticket.created_at, dot: "bg-faint" },
    ...statusEvents.map((e) => ({
      label: `Marked as ${e.to_value ?? "updated"}`,
      at: e.created_at,
      dot: STATUS_DOT[e.to_value ?? ""] ?? "bg-faint",
    })),
  ];
  const lastUpdatedAt = [ticket.created_at, ...statusEvents.map((e) => e.created_at), ...replies.map((r) => r.created_at)].reduce(
    (max, d) => (d > max ? d : max),
    ticket.created_at
  );

  return (
    <main className="mx-auto flex w-full flex-1 flex-col gap-[18px] px-[42px] pb-[67.5px] pt-[42px]">
      <div className="flex flex-col gap-[13.5px] rounded-[18px] bg-admin-gradient px-[27px] py-[22.5px] text-paper shadow-[0_12px_32px_rgba(76,29,149,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-[15px]">
          <div className="flex flex-col gap-[6px]">
            <span className="font-mono-plex text-[10.5px] uppercase tracking-[0.08em] text-paper/70">
              {ticket.ticket_number}
            </span>
            <h1 className="font-heading text-[24px] font-semibold leading-[1.2] tracking-[-0.02em]">
              {ticket.subject}
            </h1>
          </div>
          <div className="flex items-center gap-[9px]">
            <span
              className={`inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[6px] text-[10px] font-semibold shadow-[0_2px_6px_rgba(15,23,42,0.14)] ${
                STATUS_TEXT[ticket.status] ?? STATUS_TEXT.Open
              }`}
            >
              <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT[ticket.status] ?? STATUS_DOT.Open}`} />
              {ticket.status}
            </span>
            <span
              className={`inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[6px] text-[10px] font-semibold shadow-[0_2px_6px_rgba(15,23,42,0.14)] ${
                PRIORITY_TEXT[ticket.priority] ?? PRIORITY_TEXT.Normal
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${PRIORITY_DOT[ticket.priority] ?? PRIORITY_DOT.Normal}`}
              />
              {ticket.priority} priority
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-[16.5px]">
          <div className="flex flex-col gap-[15px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-[10.5px]">
              <Avatar name={ticket.name} size={36} />
              <div className="flex flex-col">
                <span className="text-[12.75px] font-semibold text-ink">{ticket.name}</span>
                <span className="text-[9.75px] text-faint">Requester</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-[18px] gap-y-[12px] border-t border-divider pt-[13.5px] sm:grid-cols-3">
              <div className="flex items-start gap-[7.5px]">
                <Hash size={13} strokeWidth={2} className="mt-[1.5px] shrink-0 text-faint" />
                <div className="flex flex-col gap-[1.5px]">
                  <span className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                    Tracking ID
                  </span>
                  <span className="inline-flex items-center gap-[6px] font-mono-plex text-[11px] font-medium text-ink">
                    {ticket.ticket_number}
                    <CopyButton
                      value={ticket.ticket_number}
                      label="Copy tracking ID"
                      className="text-faint transition-colors hover:text-primary"
                    />
                  </span>
                </div>
              </div>
              <MetaItem icon={Tag} label="Category" value={ticket.category} />
              <MetaItem icon={Users2} label="Routed to" value={ticket.team} />
              <MetaItem icon={Clock} label="Submitted" value={formatTimestamp(ticket.created_at)} />
              <MetaItem icon={History} label="Last updated" value={formatTimestamp(lastUpdatedAt)} />
              <MetaItem icon={UserCog} label="Assigned to" value={ticket.assigned_to ?? "Unassigned"} />
            </div>

            {userRequestTypes.length > 0 && (
              <div className="flex flex-col gap-[9px] border-t border-divider pt-[13.5px]">
                <span className="inline-flex items-center gap-[6px] text-[8.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                  <ListChecks size={11.5} strokeWidth={2.25} />
                  User request
                </span>
                <div className="flex flex-wrap gap-[6px]">
                  {userRequestTypes.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-[color:var(--color-violet)]/25 bg-[color:var(--color-violet-light)] px-[9px] py-[4.5px] text-[9px] font-semibold text-[color:var(--color-violet-text)]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[9px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <IdCard size={12} strokeWidth={2.25} />
              Contact details
            </span>
            <div className="grid grid-cols-2 gap-x-[18px] gap-y-[12px] sm:grid-cols-3">
              <MetaItem icon={IdCard} label="Staff No" value={ticket.staff_no} />
              <MetaItem icon={Mail} label="Email" value={ticket.email} />
              <MetaItem icon={Phone} label="Phone" value={ticket.phone} />
              <MetaItem icon={MapPin} label="Location" value={ticket.location} />
              <MetaItem icon={Building2} label="Department" value={ticket.department} />
            </div>
          </div>

          <div className="flex flex-col gap-[9px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <MessageSquareText size={12} strokeWidth={2.25} />
              Issue
            </span>
            <p className="whitespace-pre-wrap border-l-[3px] border-l-[color:var(--color-blue)] pl-[13.5px] text-[11.25px] leading-[1.6] text-ink">
              {ticket.message}
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-[9px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                <Paperclip size={12} strokeWidth={2.25} />
                Attachments ({attachments.length})
              </span>
              <div className="flex flex-wrap gap-[7.5px]">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`${basePath}/api/attachments/${a.id}?ticketNumber=${ticket.ticket_number}`}
                    className="inline-flex items-center gap-[6px] rounded-full border border-card-border bg-paper px-[10.5px] py-[6px] text-[9.75px] text-muted transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Paperclip size={11} strokeWidth={2.25} className="text-faint" />
                    {a.filename}
                    <span className="text-faint">({Math.ceil(a.size / 1024)} KB)</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[15px] lg:sticky lg:top-[84px]">
          <div className="flex flex-col gap-[12px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <History size={12} strokeWidth={2.25} />
              Activity
            </span>
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-[10.5px]">
                  <div className="flex flex-col items-center">
                    <span className={`h-[8px] w-[8px] shrink-0 rounded-full ${a.dot}`} />
                    {i < activity.length - 1 && <span className="mt-[3px] w-px flex-1 bg-divider" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-[1.5px] pb-[10.5px]">
                    <span className="text-[10px] font-medium text-ink">{a.label}</span>
                    <span className="text-[8.5px] text-faint">{formatTimestamp(a.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[12px] rounded-[14px] border border-card-border bg-white px-[18px] py-[16.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <MessageSquareText size={12} strokeWidth={2.25} />
              Conversation
              <span className="ml-auto rounded-full bg-result-bg px-[7.5px] py-[1.5px] text-[8.5px] font-semibold text-primary">
                {replies.length}
              </span>
            </span>
            {replies.length > 0 ? (
              <div className="flex flex-col">
                {replies.map((r, i) => {
                  const isRequester = r.author_email.toLowerCase() === ticket.email.toLowerCase();
                  return (
                    <div
                      key={r.id}
                      className={`flex gap-[10.5px] ${i > 0 ? "mt-[12px] border-t border-divider pt-[12px]" : ""}`}
                    >
                      <Avatar name={r.author_name} size={26} />
                      <div
                        className={`flex flex-1 flex-col gap-[3px] border-l-[2px] pl-[10.5px] ${
                          isRequester
                            ? "border-l-[color:var(--color-blue)]/50"
                            : "border-l-[color:var(--color-emerald)]/50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-[9px]">
                          <span className="text-[9.75px] font-semibold text-ink">
                            {isRequester ? "You" : r.author_name}
                          </span>
                          <span className="text-[8.5px] text-faint">{formatTimestamp(r.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[10.5px] leading-[1.5] text-muted">{r.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-[10.5px] text-faint">No updates yet.</span>
            )}

            {ticket.status !== "Closed" && <TicketReplyForm ticketNumber={ticket.ticket_number} />}
          </div>

          <TicketFeedback
            ticketNumber={ticket.ticket_number}
            status={ticket.status}
            initialFeedback={ticket.feedback === "up" || ticket.feedback === "down" ? ticket.feedback : null}
          />
        </div>
      </div>
    </main>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-[7.5px]">
      <Icon size={13} strokeWidth={2} className="mt-[1.5px] shrink-0 text-faint" />
      <div className="flex flex-col gap-[1.5px]">
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">{label}</span>
        <span className="text-[11px] font-medium text-ink">{value}</span>
      </div>
    </div>
  );
}
