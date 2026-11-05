import type { Metadata } from "next";
import { getExternalSystems } from "@/app/lib/externalSystems";
import { getIamsSession } from "@/app/lib/iamsSession";
import { canManageSystemLinks, getSystemLinks } from "@/app/lib/systemLinks";
import SystemLinks from "./SystemLinks";

export const metadata: Metadata = {
  title: "Others · Admin",
};

export default async function AdminOthers() {
  const [session, links] = await Promise.all([getIamsSession(), getSystemLinks()]);

  return (
    <SystemLinks builtIns={getExternalSystems()} initialLinks={links} canManage={!!session && canManageSystemLinks(session.role)} />
  );
}
