import type { Metadata } from "next";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import UsersOverview from "./UsersOverview";

export const metadata: Metadata = {
  title: "Users · Admin",
};

function Header({ manageUrl }: { manageUrl?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-[12px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Users</h1>
        <p className="text-[13px] text-muted-2">Everyone who signs in through IAMS. Open a person to set their helpdesk access and team.</p>
      </div>
      {manageUrl && (
        <a
          href={manageUrl}
          className="inline-flex h-[32px] items-center gap-[8px] whitespace-nowrap rounded-[8px] border border-field-border bg-surface px-[12px] text-[13px] font-medium text-ink transition-colors hover:border-field-border-hover hover:bg-surface-2"
        >
          Manage in IAMS
          <ExternalLink size={14} strokeWidth={1.75} className="text-muted-2" />
        </a>
      )}
    </div>
  );
}

export default async function AdminUsers() {
  const session = await getIamsSession();
  const permissions = session ? await getPermissionsFor(session.staffId, session.role) : null;
  if (!permissions?.manageUsers) {
    return (
      <div className="flex flex-col gap-[16px]">
        <Header />
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
      <div className="flex flex-col gap-[16px]">
        <Header />
        <div className="flex flex-col items-center gap-[12px] rounded-[16px] border border-card-border/50 bg-surface px-[20px] py-[48px] text-center">
          <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-amber-bg text-amber-text">
            <AlertTriangle size={16} strokeWidth={2} />
          </span>
          <p className="max-w-[420px] text-[13px] font-medium text-ink">{message}</p>
          <a
            href={manageUrl}
            className="inline-flex h-[32px] items-center gap-[8px] rounded-[8px] bg-primary px-[12px] text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Open IAMS user management
            <ExternalLink size={14} strokeWidth={1.75} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <Header manageUrl={manageUrl} />
      <UsersOverview users={result.users} />
    </div>
  );
}
