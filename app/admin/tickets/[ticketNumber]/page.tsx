import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getCannedResponses } from "@/app/lib/cannedResponsesServer";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PriorityBadge } from "@/app/components/TicketBadges";
import CopyButton from "@/app/tickets/[ticketNumber]/CopyButton";
import TicketWorkspace from "./TicketWorkspace";

function formatTimestamp(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/tickets/[ticketNumber]">): Promise<Metadata> {
  const { ticketNumber } = await params;
  const ticket = await prisma.tickets.findUnique({
    where: { ticket_number: ticketNumber },
    select: { subject: true },
  });
  if (!ticket) return { title: "Ticket not found · Admin" };
  return { title: `${ticketNumber} · Admin` };
}

export default async function TicketDetail({
  params,
}: PageProps<"/admin/tickets/[ticketNumber]">) {
  const { ticketNumber } = await params;

  const ticket = await prisma.tickets.findUnique({ where: { ticket_number: ticketNumber } });
  if (!ticket) notFound();

  const attachments = await prisma.attachments.findMany({
    where: { ticket_id: ticket.id },
    select: { id: true, filename: true, size: true },
  });
  const notes = await prisma.ticket_notes.findMany({
    where: { ticket_id: ticket.id },
    orderBy: { created_at: "asc" },
  });
  const events = await prisma.ticket_events.findMany({
    where: { ticket_id: ticket.id },
    orderBy: { created_at: "asc" },
  });
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  const canManage = permissions?.manageTickets ?? false;
  const userRequestTypes = JSON.parse(ticket.user_request_types) as string[];
  const cannedResponses = canManage ? await getCannedResponses() : [];

  const [iamsResult, teamMemberRows] = await Promise.all([
    getIamsUsers(),
    prisma.user_permissions.findMany({
      where: { team: ticket.team },
      select: { staff_no: true },
    }),
  ]);
  const teamStaffNos = new Set(teamMemberRows.map((r) => r.staff_no.toLowerCase()));
  const assigneeOptions = (iamsResult.users ?? [])
    .filter((u) => u.status === "approved")
    .map((u) => ({
      name: u.name,
      staffId: u.staffId,
      isTeamMember: !!u.staffId && teamStaffNos.has(u.staffId.toLowerCase()),
    }));

  return (
    <div className="flex flex-col gap-[20px]">
      <header className="home-rise flex flex-wrap items-end justify-between gap-x-[16px] gap-y-[10px]">
        <div className="flex min-w-0 flex-col gap-[8px]">
          <h1 className="max-w-[820px] text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-ink">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] text-[12px] text-muted-2">
            <span className="inline-flex h-[24px] items-center gap-[6px] rounded-[6px] border border-card-border bg-surface pl-[8px] pr-[4px] text-[12px] font-medium tabular-nums text-ink">
              {ticket.ticket_number}
              <CopyButton
                value={ticket.ticket_number}
                label="Copy ticket ID"
                className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              />
            </span>
            <PriorityBadge priority={ticket.priority} />
            <span>
              {ticket.category}
              <span aria-hidden="true" className="px-[8px]">·</span>
              Opened {formatTimestamp(ticket.created_at)}
            </span>
          </div>
        </div>
        <Link
          href={`/tickets/${encodeURIComponent(ticket.ticket_number)}`}
          target="_blank"
          className="group inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-[8px] border border-card-border bg-surface px-[10px] text-[12px] font-medium text-muted transition-colors hover:border-field-border-hover hover:text-ink"
        >
          Requester&apos;s view
          <ArrowUpRight size={14} strokeWidth={2} className="transition-transform duration-200 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
        </Link>
      </header>

      <TicketWorkspace
        ticketNumber={ticket.ticket_number}
        createdAt={ticket.created_at.toISOString()}
        initialStatus={ticket.status}
        initialAssignedTo={ticket.assigned_to}
        initialNotes={notes.map((n) => ({
          id: n.id,
          authorName: n.author_name,
          authorEmail: n.author_email,
          message: n.message,
          isPublic: !!n.is_public,
          createdAt: n.created_at.toISOString(),
        }))}
        initialEvents={events.map((e) => ({
          id: e.id,
          eventType: e.event_type,
          fromValue: e.from_value,
          toValue: e.to_value,
          actorName: e.actor_name,
          createdAt: e.created_at.toISOString(),
        }))}
        currentAdminName={session?.name ?? ""}
        canManage={canManage}
        assigneeOptions={assigneeOptions}
        cannedResponses={cannedResponses}
        message={ticket.message}
        userRequestTypes={userRequestTypes}
        attachments={attachments}
        requesterName={ticket.name}
        requesterStaffId={ticket.staff_no}
        requesterEmail={ticket.email}
        requesterPhone={ticket.phone}
        requesterLocation={ticket.location}
        requesterDepartment={ticket.department}
        category={ticket.category}
        team={ticket.team}
        priority={ticket.priority}
        submittedLabel={formatTimestamp(ticket.created_at)}
        feedback={ticket.feedback === "up" || ticket.feedback === "down" ? ticket.feedback : null}
      />
    </div>
  );
}
