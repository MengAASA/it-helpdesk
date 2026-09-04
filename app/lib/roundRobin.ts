import { prisma } from "@/app/lib/db";

type TeamMember = { staffNo: string; name: string; email: string | null };

async function getTeamMembers(team: string): Promise<TeamMember[]> {
  const rows = await prisma.user_permissions.findMany({
    where: { team },
    select: { staff_no: true, name: true, email: true },
    orderBy: { id: "asc" },
  });
  return rows
    .filter((r): r is typeof r & { name: string } => !!r.name)
    .map((r) => ({ staffNo: r.staff_no, name: r.name, email: r.email }));
}

export async function getNextRoundRobinAssignee(
  team: string
): Promise<{ name: string; email: string | null } | null> {
  const members = await getTeamMembers(team);
  if (members.length === 0) return null;

  const roundRobin = await prisma.team_round_robin.findUnique({ where: { team } });
  const lastStaffNo = roundRobin?.last_assigned_staff_no ?? null;
  const lastIndex = lastStaffNo ? members.findIndex((m) => m.staffNo === lastStaffNo) : -1;
  const next = members[(lastIndex + 1) % members.length];

  await prisma.team_round_robin.upsert({
    where: { team },
    create: { team, last_assigned_staff_no: next.staffNo },
    update: { last_assigned_staff_no: next.staffNo },
  });

  return { name: next.name, email: next.email };
}
