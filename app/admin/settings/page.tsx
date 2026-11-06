import type { Metadata } from "next";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import { getEmailSettings } from "@/app/lib/emailSettings";
import { getSlaHours } from "@/app/lib/slaSettings";
import { getCannedResponses } from "@/app/lib/cannedResponsesServer";
import { getAllEmailTemplates } from "@/app/lib/emailTemplates";
import { canManageFormOptions, getFormOptions } from "@/app/lib/formOptionsServer";
import { LIST_META } from "@/app/lib/formOptions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import EmailSettingsForm from "./EmailSettingsForm";
import SlaSettingsForm from "./SlaSettingsForm";
import CannedResponsesManager from "./CannedResponsesManager";
import EmailTemplatesManager from "./EmailTemplatesManager";
import FormOptionsManager from "./FormOptionsManager";
import SettingsTabs, { type SettingsTabKey, type TabSummary } from "./SettingsTabs";

export const metadata: Metadata = {
  title: "Settings · Admin",
};

function Header() {
  return (
    <div className="flex flex-col gap-[4px]">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
      <p className="text-[13px] text-muted-2">System-wide configuration for PHN Helpdesk.</p>
    </div>
  );
}

export default async function AdminSettings() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;

  const canEmail = permissions?.manageEmailSettings ?? false;
  const canSla = permissions?.manageSla ?? false;
  const canTemplates = permissions?.manageTemplates ?? false;
  const canFormOptions = !!session && canManageFormOptions(session.role);

  if (!canEmail && !canSla && !canTemplates && !canFormOptions) {
    return (
      <div className="flex flex-col gap-[16px]">
        <Header />
        <RestrictedMessage message="You don't have permission to manage settings." />
      </div>
    );
  }

  const [settings, slaHours, cannedResponses, emailTemplates, formOptions] = await Promise.all([
    canEmail ? getEmailSettings() : Promise.resolve(null),
    canSla ? getSlaHours() : Promise.resolve(null),
    canTemplates ? getCannedResponses() : Promise.resolve(null),
    canTemplates ? getAllEmailTemplates() : Promise.resolve(null),
    canFormOptions ? getFormOptions() : Promise.resolve(null),
  ]);

  // Where each area stands right now, for its tab. Only for the areas this person can open.
  const summaries: Partial<Record<SettingsTabKey, TabSummary>> = {};
  if (settings) {
    summaries.email = {
      state: settings.enabled ? "On" : "Off",
      on: settings.enabled,
      detail: settings.host ? `${settings.host}${settings.port ? `:${settings.port}` : ""}` : "No SMTP server set",
    };
  }
  if (slaHours) {
    summaries.sla = {
      state: slaHours.enabled ? "On" : "Off",
      on: slaHours.enabled,
      detail: `High ${slaHours.High}h · Normal ${slaHours.Normal}h · Low ${slaHours.Low}h`,
    };
  }
  if (cannedResponses) {
    const visible = cannedResponses.filter((r) => r.isPublic).length;
    summaries.templates = {
      state: String(cannedResponses.length),
      on: cannedResponses.length > 0,
      detail: `${visible} visible to requesters`,
    };
  }
  if (emailTemplates) {
    const customized = emailTemplates.filter((t) => t.isCustomized).length;
    summaries.emailTemplates = {
      state: String(emailTemplates.length),
      on: true,
      detail: customized > 0 ? `${customized} customized` : "All default wording",
    };
  }

  if (formOptions) {
    const total = formOptions.location.length + formOptions.department.length + formOptions.request_type.length;
    summaries.formOptions = {
      state: String(total),
      on: true,
      detail: `${formOptions.department.length} ${LIST_META.department.label.toLowerCase()} · ${formOptions.location.length} ${LIST_META.location.label.toLowerCase()}`,
    };
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <Header />

      <SettingsTabs
        summaries={summaries}
        email={settings && <EmailSettingsForm initialSettings={{ ...settings, password: "" }} hasPassword={!!settings.password} />}
        sla={slaHours && <SlaSettingsForm initialHours={slaHours} />}
        templates={cannedResponses && <CannedResponsesManager initialResponses={cannedResponses} />}
        emailTemplates={emailTemplates && <EmailTemplatesManager initialTemplates={emailTemplates} />}
        formOptions={formOptions && <FormOptionsManager initialOptions={formOptions} />}
      />
    </div>
  );
}
