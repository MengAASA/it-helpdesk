import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getCannedResponses } from "@/app/lib/cannedResponsesServer";
import TicketWorkspace from "./TicketWorkspace";

function formatTimestamp(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const PRIORITY_STYLES: Record<string, string> = {
  High: "border-[color:var(--color-rose)]/30 bg-paper/15 text-paper",
  Normal: "border-paper/30 bg-paper/15 text-paper",
  Low: "border-[color:var(--color-emerald)]/30 bg-paper/15 text-paper",
};

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
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-[15px] rounded-[16px] bg-admin-gradient px-[24px] py-[21px] text-paper shadow-[0_10px_28px_rgba(37,99,235,0.2)]">
        <div className="flex flex-col gap-[4.5px]">
          <span className="font-mono-plex text-[10.5px] text-paper/75">{ticket.ticket_number}</span>
          <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">{ticket.subject}</h1>
        </div>
        <span
          className={`rounded-full border px-[10.5px] py-[4.5px] text-[9px] font-semibold uppercase tracking-[0.05em] ${
            PRIORITY_STYLES[ticket.priority] ?? PRIORITY_STYLES.Normal
          }`}
        >
          {ticket.priority} priority
        </span>
      </div>

      <TicketWorkspace
        ticketNumber={ticket.ticket_number}
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
