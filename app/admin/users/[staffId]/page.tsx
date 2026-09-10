import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail, IdCard, ShieldCheck, Clock3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getIamsUsers } from "@/app/lib/iamsUsers";
import { getIamsSession } from "@/app/lib/iamsSession";
import { getPermissionsFor } from "@/app/lib/permissions";
import Avatar from "@/app/components/Avatar";
import RestrictedMessage from "@/app/components/RestrictedMessage";
import PermissionsForm from "./PermissionsForm";
import RoleForm from "./RoleForm";

export async function generateMetadata({
  params,
}: PageProps<"/admin/users/[staffId]">): Promise<Metadata> {
  const { staffId } = await params;
  const result = await getIamsUsers();
  const user = result.users?.find((u) => u.staffId?.toLowerCase() === staffId.toLowerCase());
  if (!user) return { title: "User not found · Admin" };
  return { title: `${user.name} · Admin` };
}

export default async function UserPermissionsPage({
  params,
}: PageProps<"/admin/users/[staffId]">) {
  const { staffId } = await params;

  const [result, session] = await Promise.all([getIamsUsers(), getIamsSession()]);
  if (result.error || !session) notFound();

  const user = result.users.find((u) => u.staffId?.toLowerCase() === staffId.toLowerCase());
  if (!user) notFound();

  const actorPermissions = await getPermissionsFor(session.staffId, session.role);

  if (!actorPermissions.manageUsers) {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.02em]">Users</h1>
        <RestrictedMessage message="You don't have permission to manage users." />
      </div>
    );
  }

  const targetPermissions = await getPermissionsFor(user.staffId ?? staffId, user.role);
  const isSelf = session.staffId.toLowerCase() === staffId.toLowerCase();

  return (
    <div className="flex flex-col gap-[21px]">
      <div className="flex flex-wrap items-center justify-between gap-[15px] rounded-[14px] border border-card-border bg-white px-[18px] py-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-[10.5px]">
          <Avatar name={user.name} size={36} />
          <div className="flex flex-col gap-[1.5px]">
            <span className="text-[13.5px] font-semibold text-ink">{user.name}</span>
            <span className="text-[9.75px] text-faint">{user.email.toLowerCase()}</span>
          </div>
        </div>
        <span className="rounded-full border border-pill-border bg-pill-bg px-[10.5px] py-[4.5px] text-[9px] font-semibold capitalize text-pill-text">
          {user.role} · {user.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-4">
        <Field icon={IdCard} label="Staff ID" value={user.staffId ?? "—"} />
        <Field icon={Mail} label="Email" value={user.email.toLowerCase()} />
        <Field icon={ShieldCheck} label="IAMS role" value={user.role} capitalize />
        <Field
          icon={Clock3}
          label="Registered"
          value={new Date(user.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
        />
      </div>

      <RoleForm
        staffId={user.staffId ?? staffId}
        userName={user.name}
        currentRole={user.role}
        isSelf={isSelf}
      />

      <PermissionsForm
        staffId={user.staffId ?? staffId}
        userName={user.name}
        userEmail={user.email}
        initialPermissions={targetPermissions}
        isSelf={isSelf}
      />
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[6px] rounded-[12px] border border-card-border bg-white px-[13.5px] py-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="inline-flex items-center gap-[5.25px] text-[8.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">
        <Icon size={11.5} strokeWidth={2.25} />
        {label}
      </span>
      <span className={`text-[11.25px] font-medium text-ink ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
