import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Tag, Users2, Clock, Paperclip, MessageSquareText, ListChecks } from "lucide-react";
import { prisma } from "@/app/lib/db";
import Avatar from "@/app/components/Avatar";
import TicketFeedback from "./TicketFeedback";

function formatTimestamp(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
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
  return { title: `${ticketNumber} — ${ticket.subject}` };
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
  const userRequestTypes = JSON.parse(ticket.user_request_types) as string[];

  return (
    <main className="mx-auto flex w-full flex-1 flex-col gap-[21px] px-[42px] pb-[67.5px] pt-[42px]">
      <div className="flex flex-wrap items-center justify-between gap-[15px] rounded-[16px] bg-admin-gradient px-[24px] py-[21px] text-paper shadow-[0_10px_28px_rgba(37,99,235,0.2)]">
        <div className="flex flex-col gap-[4.5px]">
          <span className="font-mono-plex text-[10.5px] text-paper/75">{ticket.ticket_number}</span>
          <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-[7.5px]">
          <span className="rounded-full border border-paper/30 bg-paper/15 px-[10.5px] py-[4.5px] text-[9px] font-semibold uppercase tracking-[0.05em]">
            {ticket.status}
          </span>
          <span className="rounded-full border border-paper/30 bg-paper/15 px-[10.5px] py-[4.5px] text-[9px] font-semibold uppercase tracking-[0.05em]">
            {ticket.priority} priority
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-[21px]">
          <div className="flex items-center gap-[10.5px] rounded-[14px] border border-card-border bg-white px-[18px] py-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Avatar name={ticket.name} size={33} />
            <span className="text-[12px] font-semibold text-ink">{ticket.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3">
            <Field icon={Tag} label="Category" value={ticket.category} />
            <Field icon={Users2} label="Routed to" value={ticket.team} />
            <Field icon={Clock} label="Submitted" value={formatTimestamp(ticket.created_at)} />
          </div>

          <div className="flex flex-col gap-[9px]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <ListChecks size={12} strokeWidth={2.25} />
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

          <div className="flex flex-col gap-[9px]">
            <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              <MessageSquareText size={12} strokeWidth={2.25} />
              Message
            </span>
            <p className="whitespace-pre-wrap rounded-[12px] border-l-[3px] border-l-[color:var(--color-blue)] bg-white px-[15px] py-[13.5px] text-[11.25px] leading-[1.6] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {ticket.message}
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-[9px]">
              <span className="inline-flex items-center gap-[6px] text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                <Paperclip size={12} strokeWidth={2.25} />
                Attachments
              </span>
              <div className="flex flex-wrap gap-[7.5px]">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/attachments/${a.id}?ticketNumber=${ticket.ticket_number}`}
                    className="inline-flex items-center gap-[6px] rounded-full border border-card-border bg-white px-[10.5px] py-[6px] text-[9.75px] text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
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
              <MessageSquareText size={12} strokeWidth={2.25} />
              Updates from IT ({replies.length})
            </span>
            {replies.length > 0 ? (
              <div className="flex flex-col gap-[10.5px]">
                {replies.map((r) => (
                  <div key={r.id} className="flex gap-[9px]">
                    <Avatar name={r.author_name} size={24} />
                    <div className="flex flex-1 flex-col gap-[1.5px] rounded-[10px] border-l-[3px] border-l-[color:var(--color-emerald)] bg-[color:var(--color-emerald-light)]/40 px-[12px] py-[9px]">
                      <div className="flex flex-wrap items-center justify-between gap-[9px]">
                        <span className="text-[9.75px] font-semibold text-ink">{r.author_name}</span>
                        <span className="text-[8.5px] text-faint">{formatTimestamp(r.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[10.5px] leading-[1.5] text-muted">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10.5px] text-faint">No updates yet.</span>
            )}
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

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[6px] rounded-[12px] border border-card-border bg-white px-[13.5px] py-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="inline-flex items-center gap-[5.25px] text-[8.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
        <Icon size={11.5} strokeWidth={2.25} />
        {label}
      </span>
      <span className="text-[11.25px] font-medium text-ink">{value}</span>
    </div>
  );
}
