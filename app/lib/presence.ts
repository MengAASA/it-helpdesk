import { prisma } from "@/app/lib/db";

const ONLINE_THRESHOLD_SECONDS = 90;

export async function recordHeartbeat(staffId: string, name: string): Promise<void> {
  const staff_no = staffId.trim().toLowerCase();
  await prisma.active_sessions.upsert({
    where: { staff_no },
    create: { staff_no, name, last_seen: new Date() },
    update: { name, last_seen: new Date() },
  });
}

export async function getOnlineUsers(): Promise<{ staffId: string; name: string }[]> {
  const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
  const rows = await prisma.active_sessions.findMany({
    where: { last_seen: { gt: cutoff } },
    orderBy: { last_seen: "desc" },
  });
  return rows.map((r) => ({ staffId: r.staff_no, name: r.name }));
}
