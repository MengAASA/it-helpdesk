import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { describeEvent } from "@/app/lib/ticketEvents";
import { getSettingsAuditLog } from "@/app/lib/settingsAudit";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import ActivityTable from "./ActivityTable";
import SettingsAuditTable from "./SettingsAuditTable";
import ActivityTabs from "./ActivityTabs";

export const metadata: Metadata = {
  title: "Activity · Admin",
};

const EVENT_LIMIT = 200;

export default async function AdminActivity() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.viewActivity) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Activity</h1>
        <RestrictedMessage message="You don't have permission to view activity." />
      </div>
    );
  }

  const [events, auditLog] = await Promise.all([
    prisma.ticket_events.findMany({
      orderBy: { created_at: "desc" },
      take: EVENT_LIMIT,
      select: {
        id: true,
        event_type: true,
        from_value: true,
        to_value: true,
        actor_name: true,
        created_at: true,
        tickets: { select: { ticket_number: true, subject: true } },
      },
    }),
    getSettingsAuditLog(EVENT_LIMIT),
  ]);

  const rows = events.map((e) => ({
    id: e.id,
    createdAt: e.created_at.toISOString(),
    createdAtLabel: e.created_at.toLocaleString(),
    eventType: e.event_type,
    actorName: e.actor_name,
    ticketNumber: e.tickets.ticket_number,
    subject: e.tickets.subject,
    description: describeEvent({ eventType: e.event_type, fromValue: e.from_value, toValue: e.to_value }),
  }));

  const auditRows = auditLog.map((r) => ({
    ...r,
    createdAtLabel: new Date(r.createdAt).toLocaleString(),
  }));

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-[4.5px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Activity</h1>
        <p className="text-[10.5px] text-muted">
          The last {EVENT_LIMIT} ticket changes, and the last {EVENT_LIMIT} permission and settings
          changes, across the system.
        </p>
      </div>

      <ActivityTabs
        tickets={<ActivityTable events={rows} />}
        settings={<SettingsAuditTable entries={auditRows} />}
      />
    </div>
  );
}
