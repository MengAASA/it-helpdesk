import { getIamsSession } from "@/app/lib/iamsSession";
import { getFormOptions } from "@/app/lib/formOptionsServer";
import SubmitTicketForm from "./TicketForm";

export default async function TicketPage() {
  const [session, options] = await Promise.all([getIamsSession(), getFormOptions()]);

  return (
    <SubmitTicketForm
      initialName={session?.name ?? ""}
      initialEmail={session?.email ?? ""}
      initialStaffNo={session?.staffId ?? ""}
      options={options}
    />
  );
}
