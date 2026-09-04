import type { Metadata } from "next";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getEmailSettings } from "@/app/lib/emailSettings";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getCannedResponses } from "@/app/lib/cannedResponsesServer";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import EmailSettingsForm from "./EmailSettingsForm";
import SlaSettingsForm from "./SlaSettingsForm";
import CannedResponsesManager from "./CannedResponsesManager";
import SettingsTabs from "./SettingsTabs";

export const metadata: Metadata = {
  title: "Settings · Admin",
};

export default async function AdminSettings() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId) : null;

  if (!permissions?.manageUsers) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Settings</h1>
        <RestrictedMessage message="You don't have permission to manage settings." />
      </div>
    );
  }

  const [settings, slaHours, cannedResponses] = await Promise.all([
    getEmailSettings(),
    getSlaHours(),
    getCannedResponses(),
  ]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-[4.5px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="text-[10.5px] text-muted">System-wide configuration for PHN Helpdesk.</p>
      </div>

      <SettingsTabs
        email={<EmailSettingsForm initialSettings={{ ...settings, password: "" }} hasPassword={!!settings.password} />}
        sla={<SlaSettingsForm initialHours={slaHours} />}
        templates={<CannedResponsesManager initialResponses={cannedResponses} />}
      />
    </div>
  );
}
