import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { getEmailSettings } from "@/app/lib/emailSettings";
import Avatar from "@/app/components/Avatar";
import { PriorityBadge, StatusDot } from "@/app/components/TicketBadges";
import TicketFeedback from "./TicketFeedback";
import TicketReplyForm from "./TicketReplyForm";
import CopyButton from "./CopyButton";
import StatusSteps from "@/app/components/StatusSteps";
import { fileExtLabel, formatFileSize } from "@/app/lib/fileFormat";
import { Detail, DetailGroup } from "@/app/components/DetailList";

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

type Entry =
  | { kind: "reply"; key: string; at: Date; author: string; mine: boolean; message: string }
  | { kind: "event"; key: string; at: Date; actor: string; text: string; status: string };

function eventText(from: string | null, to: string | null): string {
  if (to === "Closed") return "closed this ticket";
  if (to === "Open" && from === "Closed") return "reopened this ticket";
  if (to === "In Progress") return "started working on it";
  return `marked it ${to ?? "updated"}`;
}

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

  const [attachments, replies, statusEvents, emailSettings] = await Promise.all([
    prisma.attachments.findMany({
      where: { ticket_id: ticket.id },
      select: { id: true, filename: true, size: true },
    }),
    prisma.ticket_notes.findMany({
      where: { ticket_id: ticket.id, is_public: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.ticket_events.findMany({
      where: { ticket_id: ticket.id, event_type: "status" },
      orderBy: { created_at: "asc" },
    }),
    getEmailSettings(),
  ]);
  const userRequestTypes = JSON.parse(ticket.user_request_types) as string[];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const isRequester = (nameOrEmail: string) =>
    nameOrEmail.toLowerCase() === ticket.email.toLowerCase();

  // Replies and status changes, in the order they happened. On a tie (IT replies and closes in
  // one go) the reply reads first.
  const entries: Entry[] = [
    ...replies.map((r) => ({
      kind: "reply" as const,
      key: `r${r.id}`,
      at: r.created_at,
      author: r.author_name,
      mine: isRequester(r.author_email),
      message: r.message,
    })),
    ...statusEvents.map((e) => ({
      kind: "event" as const,
      key: `e${e.id}`,
      at: e.created_at,
      actor: e.actor_name === ticket.name ? "You" : e.actor_name,
      text: eventText(e.from_value, e.to_value),
      status: e.to_value ?? "",
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === "reply" ? -1 : 1));

  const lastUpdatedAt = [ticket.created_at, ...entries.map((e) => e.at)].reduce(
    (max, d) => (d > max ? d : max),
    ticket.created_at
  );

  const closed = ticket.status === "Closed";
  const lastReply = replies[replies.length - 1];
  const waitingOnIt = !closed && (!lastReply || isRequester(lastReply.author_email));
  const emailsReplies = emailSettings.enabled && emailSettings.notifyNewReply;

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[20px] px-[16px] pb-[56px] pt-[24px] md:px-[32px] md:pt-[32px]">
      <header className="home-rise flex flex-col gap-[10px]">
        <Link
          href="/tickets"
          className="group inline-flex w-fit items-center gap-[6px] text-[12px] font-medium text-muted-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:-translate-x-[2px]" />
          Your tickets
        </Link>
        <h1 className="max-w-[760px] text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-ink">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] text-[12px] text-muted-2">
          <span className="inline-flex h-[24px] items-center gap-[6px] rounded-[6px] border border-card-border bg-surface pl-[8px] pr-[4px] text-[12px] font-medium tabular-nums text-ink">
            {ticket.ticket_number}
            <CopyButton
              value={ticket.ticket_number}
              label="Copy ticket ID"
              className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            />
          </span>
          <span>
            {ticket.category}
            <span aria-hidden="true" className="px-[8px]">·</span>
            Opened {formatTimestamp(ticket.created_at)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
        <StatusCard
          className="lg:col-start-2 lg:row-start-1"
          status={ticket.status}
          assignee={ticket.assigned_to}
          team={ticket.team}
          createdAt={ticket.created_at}
          lastUpdatedAt={lastUpdatedAt}
          events={statusEvents.map((e) => ({ to: e.to_value, from: e.from_value, at: e.created_at }))}
        />

        {/* The whole story in one thread: the request, every reply and status change, then your turn. */}
        <section aria-label="Conversation" className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <ol className="relative flex flex-col gap-[14px]">
            <span aria-hidden="true" className="absolute bottom-[14px] left-[13.5px] top-[14px] w-px bg-divider" />

            <li className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={{ "--d": "60ms" } as React.CSSProperties}>
              <Avatar name={ticket.name} size={28} />
              <article className="flex flex-col overflow-hidden rounded-[14px] border border-card-border bg-surface">
                <div className="flex flex-wrap items-baseline justify-between gap-x-[10px] gap-y-[2px] px-[16px] pt-[12px]">
                  <span className="text-[13px] text-muted-2">
                    <span className="font-semibold text-ink">{ticket.name}</span> opened this ticket
                  </span>
                  <time dateTime={ticket.created_at.toISOString()} className="text-[12px] text-faint">
                    {formatTimestamp(ticket.created_at)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words px-[16px] pb-[14px] pt-[8px] text-[13px] leading-[21px] text-ink">
                  {ticket.message}
                </p>
                {attachments.length > 0 && (
                  <div className="flex flex-col gap-[8px] border-t border-divider bg-surface-2/40 px-[16px] py-[12px]">
                    <span className="text-[12px] font-medium text-muted-2">
                      {attachments.length} {attachments.length === 1 ? "file" : "files"} on this ticket
                    </span>
                    <ul className="grid grid-cols-1 gap-[6px] sm:grid-cols-2">
                      {attachments.map((a) => (
                        <li key={a.id}>
                          <a
                            href={`${basePath}/api/attachments/${a.id}?ticketNumber=${ticket.ticket_number}`}
                            className="group flex items-center gap-[10px] rounded-[10px] border border-card-border bg-surface p-[6px] pr-[10px] transition-colors hover:border-field-border-hover"
                          >
                            <span className="flex h-[30px] w-[38px] shrink-0 items-center justify-center rounded-[6px] bg-ink text-[11px] font-semibold tracking-[0.02em] text-paper">
                              {fileExtLabel(a.filename)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13px] font-medium text-ink" title={a.filename}>{a.filename}</span>
                              <span className="text-[11px] text-muted-2">{formatFileSize(a.size)}</span>
                            </span>
                            <Download size={14} strokeWidth={2} className="shrink-0 text-faint transition-[color,transform] duration-200 group-hover:translate-y-[1px] group-hover:text-ink" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            </li>

            {entries.map((entry, i) => {
              const style = { "--d": `${Math.min(120 + i * 50, 450)}ms` } as React.CSSProperties;
              if (entry.kind === "event") {
                return (
                  <li key={entry.key} className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] items-center gap-[12px]" style={style}>
                    <span className="flex justify-center">
                      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-paper ring-1 ring-card-border">
                        <StatusDot status={entry.status} />
                      </span>
                    </span>
                    <p className="flex flex-wrap items-baseline gap-x-[6px] text-[12px] text-muted-2">
                      <span>
                        <span className="font-medium text-ink">{entry.actor}</span> {entry.text}
                      </span>
                      <time dateTime={entry.at.toISOString()} className="text-faint">
                        · {formatTimestamp(entry.at)}
                      </time>
                    </p>
                  </li>
                );
              }
              return (
                <li key={entry.key} className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={style}>
                  <Avatar name={entry.author} size={28} />
                  <article
                    className={`flex flex-col gap-[6px] rounded-[14px] px-[16px] py-[12px] ${
                      entry.mine ? "bg-primary-soft" : "border border-card-border bg-surface"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-[10px] gap-y-[2px]">
                      <span className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-ink">
                        {entry.mine ? "You" : entry.author}
                        {!entry.mine && (
                          <span className="inline-flex h-[18px] items-center rounded-[5px] bg-ink px-[6px] text-[11px] font-medium text-paper">
                            IT
                          </span>
                        )}
                      </span>
                      <time dateTime={entry.at.toISOString()} className="text-[12px] text-faint">
                        {formatTimestamp(entry.at)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-[21px] text-ink">{entry.message}</p>
                  </article>
                </li>
              );
            })}

            {waitingOnIt && (
              <li className="home-rise relative grid grid-cols-[28px_minmax(0,1fr)] items-center gap-[12px]" style={{ "--d": "300ms" } as React.CSSProperties}>
                <span className="flex justify-center">
                  <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-paper ring-1 ring-card-border">
                    <span className="animate-phn-pulse h-[6px] w-[6px] rounded-full bg-primary" />
                  </span>
                </span>
                <p className="text-[12px] text-muted-2">
                  Waiting for IT to reply.{" "}
                  {emailsReplies ? (
                    <>
                      We&apos;ll email <span className="font-medium text-ink">{ticket.email}</span> when they do.
                    </>
                  ) : (
                    "Their reply will show up here."
                  )}
                </p>
              </li>
            )}
          </ol>

          <div className="home-rise mt-[18px] grid grid-cols-[28px_minmax(0,1fr)] gap-[12px]" style={{ "--d": "360ms" } as React.CSSProperties}>
            <Avatar name={ticket.name} size={28} />
            <div className="min-w-0">
              {closed ? (
                <TicketFeedback
                  ticketNumber={ticket.ticket_number}
                  status={ticket.status}
                  initialFeedback={ticket.feedback === "up" || ticket.feedback === "down" ? ticket.feedback : null}
                />
              ) : (
                <TicketReplyForm ticketNumber={ticket.ticket_number} />
              )}
            </div>
          </div>
        </section>

        <aside
          aria-label="Ticket details"
          className="home-rise flex flex-col gap-[16px] rounded-[14px] border border-card-border bg-surface p-[16px] lg:col-start-2 lg:row-start-2 lg:self-start"
          style={{ "--d": "180ms" } as React.CSSProperties}
        >
          <DetailGroup title="Ticket">
            <Detail label="Category" value={ticket.category} />
            <Detail label="Priority">
              <PriorityBadge priority={ticket.priority} />
            </Detail>
            {userRequestTypes.length > 0 && (
              <Detail label="Request">
                <span className="flex flex-wrap gap-[4px]">
                  {userRequestTypes.map((r) => (
                    <span key={r} className="inline-flex h-[22px] items-center rounded-full bg-surface-2 px-[8px] text-[12px] text-ink">
                      {r}
                    </span>
                  ))}
                </span>
              </Detail>
            )}
            <Detail label="Submitted" value={formatTimestamp(ticket.created_at)} />
          </DetailGroup>
          <div className="h-px bg-divider" />
          <DetailGroup title="Requester">
            <Detail label="Name" value={ticket.name} />
            <Detail label="Staff ID" value={ticket.staff_no} />
            <Detail label="Email" value={ticket.email} />
            <Detail label="Phone" value={ticket.phone} />
            <Detail label="Location" value={ticket.location} />
            <Detail label="Department" value={ticket.department} />
          </DetailGroup>
        </aside>
      </div>
    </main>
  );
}

/**
 * The first thing anyone wants to know: where is it up to? A dark card with the current state in
 * plain words, a three-step track with the time each step was reached, and who has it.
 */
function StatusCard({
  className,
  status,
  assignee,
  team,
  createdAt,
  lastUpdatedAt,
  events,
}: {
  className: string;
  status: string;
  assignee: string | null;
  team: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  events: { from: string | null; to: string | null; at: Date }[];
}) {

  const headline =
    status === "Closed"
      ? "This ticket is closed"
      : status === "In Progress"
        ? `${assignee ?? "IT"} is working on it`
        : assignee
          ? `With ${assignee}, not started yet`
          : "Waiting for IT to pick it up";

  return (
    <section
      aria-label="Status"
      className={`tile-ink home-rise flex flex-col gap-[16px] rounded-[16px] p-[16px] ${className}`}
      style={{ "--d": "100ms" } as React.CSSProperties}
    >
      <div className="flex flex-col gap-[4px]">
        <span className="text-[12px] text-muted-2">Status</span>
        <span className="inline-flex items-center gap-[8px] text-[20px] font-semibold tracking-[-0.01em] text-ink">
          <StatusDot status={status} />
          {status}
        </span>
        <span className="text-[13px] text-muted">{headline}</span>
      </div>

      <StatusSteps status={status} createdAt={createdAt} events={events} />

      <dl className="flex flex-col gap-[8px] border-t border-divider pt-[14px] text-[13px]">
        <div className="flex items-center justify-between gap-[12px]">
          <dt className="text-muted-2">Assigned to</dt>
          <dd className="flex min-w-0 items-center gap-[6px] font-medium text-ink">
            {assignee ? (
              <>
                <Avatar name={assignee} size={18} />
                <span className="truncate">{assignee}</span>
              </>
            ) : (
              <span className="text-muted">Nobody yet</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-[12px]">
          <dt className="text-muted-2">Team</dt>
          <dd className="truncate font-medium text-ink">{team}</dd>
        </div>
        <div className="flex items-center justify-between gap-[12px]">
          <dt className="text-muted-2">Last update</dt>
          <dd className="truncate tabular-nums text-ink">{formatTimestamp(lastUpdatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
