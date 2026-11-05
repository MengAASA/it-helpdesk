import type { IamsUser } from "@/app/lib/iamsUsers";
import { getPermissionsFor } from "@/app/lib/permissions";
import { TEAMS } from "@/app/lib/teams";
import { SegmentBar } from "../DashboardCharts";
import UsersTable from "./UsersTable";
import { TEAM_DOT, UNASSIGNED } from "../teamStyle";

/** "10 Sep 2026", the same date style as the tickets list. */
function registeredLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getFullYear()}`;
}

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** Summary card and list for the IAMS users. The page checks manageUsers before rendering this. */
export default async function UsersOverview({ users }: { users: IamsUser[] }) {
  const adminCount = users.filter((u) => u.role === "admin").length;
  const pendingCount = users.filter((u) => u.status === "pending").length;

  const teamByStaffId = new Map<string, string | null>();
  await Promise.all(
    users.map(async (u) => {
      if (!u.staffId) return;
      const p = await getPermissionsFor(u.staffId, u.role);
      teamByStaffId.set(u.staffId, p.team);
    }),
  );
  const rows = users.map((u) => ({
    ...u,
    team: u.staffId ? (teamByStaffId.get(u.staffId) ?? null) : null,
    registered: registeredLabel(u.createdAt),
  }));

  // Teams are set per staff ID, so the team split covers only people who have one.
  const withStaffId = rows.filter((u) => u.staffId);
  const noStaffIdCount = rows.length - withStaffId.length;
  const teamSplit = [
    ...TEAMS.map((team) => ({ label: team, value: withStaffId.filter((u) => u.team === team).length, className: TEAM_DOT[team] })),
    { label: UNASSIGNED, value: withStaffId.filter((u) => !u.team).length, className: "bg-white/25" },
  ];

  return (
    <>
      {/* One dark summary card instead of a row of counters: totals on the left, team split on the right. */}
      <section aria-label="Summary" className="tile-ink @container rounded-[16px] p-[20px]">
        <div className="flex flex-col gap-[20px] @min-[720px]:flex-row @min-[720px]:items-stretch">
          <div className="flex shrink-0 flex-col justify-between gap-[16px] @min-[720px]:w-[300px]">
            <div>
              <p className="text-[12px] text-muted-2">People with access</p>
              <div className="mt-[6px] flex items-end gap-[8px]">
                <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{users.length}</span>
                <span className="pb-[5px] text-[13px] text-muted-2">{users.length === 1 ? "user" : "users"} in IAMS</span>
              </div>
            </div>
            <dl className="flex gap-[28px]">
              <div>
                <dt className="flex items-center gap-[6px] text-[12px] text-muted-2">
                  <span className="h-[7px] w-[7px] rounded-full bg-primary-light" aria-hidden="true" />
                  Admins
                </dt>
                <dd className="mt-[2px] text-[20px] font-semibold tabular-nums text-ink">{adminCount}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-[6px] text-[12px] text-muted-2">
                  <span className="h-[7px] w-[7px] rounded-full bg-amber-solid" aria-hidden="true" />
                  Pending approval
                </dt>
                <dd className="mt-[2px] text-[20px] font-semibold tabular-nums text-ink">{pendingCount}</dd>
              </div>
            </dl>
          </div>

          <div className="h-px shrink-0 bg-white/10 @min-[720px]:h-auto @min-[720px]:w-px" aria-hidden="true" />

          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <div className="flex items-baseline justify-between gap-[12px]">
              <h2 className="text-[13px] font-semibold text-ink">By team</h2>
              <span className="text-[12px] tabular-nums text-muted-2">{withStaffId.length} with a staff ID</span>
            </div>
            <SegmentBar segments={teamSplit} height={10} />
            <ul className="grid grid-cols-1 gap-x-[24px] gap-y-[8px] @min-[480px]:grid-cols-2">
              {teamSplit.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-[12px] text-[13px]">
                  <span className="flex min-w-0 items-center gap-[8px] text-muted">
                    <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${s.className}`} aria-hidden="true" />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink">
                    <span className="font-semibold">{s.value}</span>
                    <span className="ml-[6px] text-[12px] text-muted-2">{percent(s.value, withStaffId.length)}%</span>
                  </span>
                </li>
              ))}
            </ul>
            {noStaffIdCount > 0 && (
              <p className="text-[12px] text-muted-2">
                {noStaffIdCount} {noStaffIdCount === 1 ? "person has" : "people have"} no staff ID yet, so no team.
              </p>
            )}
          </div>
        </div>
      </section>

      <UsersTable users={rows} />
    </>
  );
}
