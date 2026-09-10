import { getIamsSession } from "@/app/lib/iamsSession";
import SubmitTicketForm from "./TicketForm";

export default async function TicketPage() {
  const session = await getIamsSession();

  return (
    <SubmitTicketForm
      initialName={session?.name ?? ""}
      initialEmail={session?.email ?? ""}
      initialStaffNo={session?.staffId ?? ""}
    />
  );
}
