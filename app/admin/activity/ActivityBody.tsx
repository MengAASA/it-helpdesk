import { prisma } from "@/app/lib/db";
import { describeEvent } from "@/app/lib/ticketEvents";
import { getSettingsAuditLog } from "@/app/lib/settingsAudit";
import ActivityTable from "./ActivityTable";
import SettingsAuditTable from "./SettingsAuditTable";
import ActivityTabs from "./ActivityTabs";

const EVENT_LIMIT = 200;

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The moment this request renders, used for the "Today" / "Yesterday" headings. */
function renderTime(): Date {
  return new Date();
}

/**
 * Timestamp parts for a log row, all in the server's local time (the same clock the tickets
 * list uses), so the day headings, dates and times always agree with each other.
 */
function stamp(value: Date, now: Date) {
  const d = new Date(value);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dayKey = dayKeyOf(d);
  const dayLabel =
    dayKey === dayKeyOf(now)
      ? "Today"
      : dayKey === dayKeyOf(yesterday)
      ? "Yesterday"
      : d.getFullYear() === now.getFullYear()
      ? `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${d.getDate()} ${month}`
      : `${d.getDate()} ${month} ${d.getFullYear()}`;
  return {
    createdAt: d.toISOString(),
    dayKey,
    dayLabel,
    date: `${d.getDate()} ${month} ${d.getFullYear()}`,
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export default async function ActivityBody() {
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

  const now = renderTime();

  const rows = events.map((e) => ({
    id: e.id,
    ...stamp(e.created_at, now),
    eventType: e.event_type,
    fromValue: e.from_value,
    toValue: e.to_value,
    actorName: e.actor_name,
    ticketNumber: e.tickets.ticket_number,
    subject: e.tickets.subject,
    description: describeEvent({ eventType: e.event_type, fromValue: e.from_value, toValue: e.to_value }),
  }));

  const auditRows = auditLog.map((r) => ({
    ...r,
    ...stamp(new Date(r.createdAt), now),
  }));

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Activity</h1>
        <p className="text-[13px] text-muted-2">
          Who changed what, newest first. Shows the latest {EVENT_LIMIT} ticket changes and the latest {EVENT_LIMIT}{" "}
          permission and settings changes.
        </p>
      </div>

      <ActivityTabs
        counts={{ tickets: rows.length, settings: auditRows.length }}
        tickets={<ActivityTable events={rows} />}
        settings={<SettingsAuditTable entries={auditRows} />}
      />
    </div>
  );
}
