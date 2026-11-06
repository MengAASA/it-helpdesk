import { NextResponse } from "next/server";
import { getIamsSession } from "@/app/lib/iamsSession";
import { LIST_META, cleanOptionList, isFormOptionList } from "@/app/lib/formOptions";
import { canManageFormOptions, getFormOptions, saveFormOptionList } from "@/app/lib/formOptionsServer";
import { logFormOptionsChange } from "@/app/lib/settingsAudit";

/** Replaces one of the ticket form's pick lists: { list: "department", options: ["...", ...] }. */
export async function PUT(req: Request) {
  const session = await getIamsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFormOptions(session.role)) {
    return NextResponse.json({ error: "Only admins can change form options" }, { status: 403 });
  }

  const body: { list?: unknown; options?: unknown } | null = await req.json().catch(() => null);
  const list = body?.list;
  if (!isFormOptionList(list)) return NextResponse.json({ error: "Unknown list" }, { status: 400 });

  const cleaned = cleanOptionList(list, body?.options);
  if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 400 });

  const before = (await getFormOptions())[list];
  await saveFormOptionList(list, cleaned.value);
  await logFormOptionsChange({
    listLabel: LIST_META[list].label,
    before,
    after: cleaned.value,
    actorName: session.name,
    actorEmail: session.email,
  });

  return NextResponse.json({ list, options: cleaned.value });
}
