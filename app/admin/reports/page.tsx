import type { Metadata } from "next";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import ReportsBody from "./ReportsBody";

export const metadata: Metadata = {
  title: "Reports · Admin",
};

export default async function AdminReports() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.viewReports) {
    return (
      <div className="flex flex-col gap-[16px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Reports</h1>
        <RestrictedMessage message="You don't have permission to view reports." />
      </div>
    );
  }
  return <ReportsBody />;
}
