import type { Metadata } from "next";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import ActivityBody from "./ActivityBody";

export const metadata: Metadata = {
  title: "Activity · Admin",
};

export default async function AdminActivity() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.viewActivity) {
    return (
      <div className="flex flex-col gap-[16px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Activity</h1>
        <RestrictedMessage message="You don't have permission to view activity." />
      </div>
    );
  }
  return <ActivityBody />;
}
