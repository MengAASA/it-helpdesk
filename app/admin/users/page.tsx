import type { Metadata } from "next";
import { Users2, ShieldCheck, Clock3, ExternalLink, AlertTriangle } from "lucide-react";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { TEAMS } from "@/app/lib/teams";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import KpiCard from "../KpiCard";
import UsersTable from "./UsersTable";

export const metadata: Metadata = {
  title: "Users · Admin",
};

export default async function AdminUsers() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId) : null;
  if (!permissions?.manageUsers) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Users</h1>
        <RestrictedMessage message="You don't have permission to manage users." />
      </div>
    );
  }

  const result = await getIamsUsers();
  const manageUrl = process.env.IAMS_BASE_URL ? `${process.env.IAMS_BASE_URL}/user-management` : "#";

  if (result.error) {
    const message =
      result.error === "forbidden"
        ? "Your IAMS account isn't an administrator, so the user list can't be loaded here."
        : result.error === "unauthenticated"
          ? "Your session could not be verified with IAMS."
          : "Could not reach IAMS to load users.";

    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Users</h1>
        <div className="flex flex-col items-center justify-center gap-[10.5px] rounded-[14px] border border-dashed border-amber-border bg-amber-bg px-[18px] py-[48px] text-center">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[color:var(--color-amber-solid)] text-paper shadow-[0_6px_16px_rgba(217,119,6,0.25)]">
            <AlertTriangle size={20} strokeWidth={2.25} />
          </span>
          <span className="text-[12.75px] font-semibold text-ink">{message}</span>
          <a
            href={manageUrl}
            className="inline-flex items-center gap-[6px] rounded-full bg-admin-gradient px-[15px] py-[7.5px] text-[9.75px] font-semibold text-paper"
          >
            Open IAMS user management <ExternalLink size={12} strokeWidth={2.25} />
          </a>
        </div>
      </div>
    );
  }

  const { users } = result;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const pendingCount = users.filter((u) => u.status === "pending").length;

  const teamByStaffId = new Map<string, string | null>();
  await Promise.all(
    users.map(async (u) => {
      if (!u.staffId) return;
      const p = await getPermissionsFor(u.staffId);
      teamByStaffId.set(u.staffId, p.team);
    })
  );
  const usersWithTeam = users.map((u) => ({
    ...u,
    team: u.staffId ? teamByStaffId.get(u.staffId) ?? null : null,
  }));
  const unassignedCount = usersWithTeam.filter((u) => u.staffId && !u.team).length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-[9px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Users</h1>
        <a
          href={manageUrl}
          className="inline-flex items-center gap-[6px] rounded-full border border-card-border bg-white px-[12px] py-[6px] text-[10.5px] font-semibold text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/40 hover:text-primary"
        >
          Manage in IAMS <ExternalLink size={12} strokeWidth={2.25} />
        </a>
      </div>

      <div className="flex flex-wrap gap-[12px]">
        <KpiCard label="Total users" value={users.length} icon={Users2} tone="primary" />
        <KpiCard label="Admins" value={adminCount} icon={ShieldCheck} tone="violet" />
        <KpiCard label="Pending approval" value={pendingCount} icon={Clock3} tone="amber" />
        {TEAMS.map((team) => (
          <KpiCard
            key={team}
            label={team}
            value={usersWithTeam.filter((u) => u.team === team).length}
            icon={Users2}
            tone="blue"
          />
        ))}
        <KpiCard label="Unassigned" value={unassignedCount} icon={Users2} tone="amber" />
      </div>

      <UsersTable users={usersWithTeam} />
    </div>
  );
}
