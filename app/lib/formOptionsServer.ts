import { prisma } from "@/app/lib/db";
import { DEFAULT_FORM_OPTIONS, FORM_OPTION_LISTS, type FormOptionList, type FormOptions } from "@/app/lib/formOptions";

/** Only people with the IAMS admin role can edit the form's pick lists. */
export function canManageFormOptions(role: string): boolean {
  return role === "admin";
}

/**
 * Every list in its saved order. If the table can't be read (say the migration hasn't run yet),
 * the form keeps working with the built-in defaults instead of failing.
 */
export async function getFormOptions(): Promise<FormOptions> {
  try {
    const rows = await prisma.form_options.findMany({ orderBy: [{ sort_order: "asc" }, { id: "asc" }] });
    const result = Object.fromEntries(FORM_OPTION_LISTS.map((l) => [l, [] as string[]])) as FormOptions;
    for (const r of rows) {
      if ((FORM_OPTION_LISTS as readonly string[]).includes(r.list_key)) result[r.list_key as FormOptionList].push(r.label);
    }
    return result;
  } catch (err) {
    console.error("[form-options] falling back to defaults", err);
    return DEFAULT_FORM_OPTIONS;
  }
}

/** Replaces one list with `labels`, in that order. */
export async function saveFormOptionList(list: FormOptionList, labels: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.form_options.deleteMany({ where: { list_key: list } }),
    prisma.form_options.createMany({
      data: labels.map((label, i) => ({ list_key: list, label, sort_order: i })),
    }),
  ]);
}
