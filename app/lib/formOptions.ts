/**
 * The pick lists on the ticket form (location, department, request type). Admins edit them in
 * Settings → Form options; they live in the `form_options` table. The defaults below are what the
 * form used before the lists became editable: the migration loads them, and the form falls back to
 * them if the table can't be read. Safe to import from client components.
 */

export const FORM_OPTION_LISTS = ["location", "department", "request_type"] as const;
export type FormOptionList = (typeof FORM_OPTION_LISTS)[number];
export type FormOptions = Record<FormOptionList, string[]>;

export const LIST_META: Record<FormOptionList, { label: string; singular: string; description: string; required: boolean }> = {
  location: {
    label: "Locations",
    singular: "location",
    description: "The Location dropdown. Everyone filing a ticket must pick one, so the list can't be empty.",
    required: true,
  },
  department: {
    label: "Departments",
    singular: "department",
    description: "The Department dropdown. Required on the form, so keep at least one; \"-\" works for staff without one.",
    required: true,
  },
  request_type: {
    label: "Request types",
    singular: "request type",
    description: "The optional Request type chips. Leave the list empty to hide that question.",
    required: false,
  },
};

export const OPTION_LABEL_MAX = 150;
export const OPTION_LIST_MAX = 200;

const DEFAULT_LOCATIONS = [
  "PHN Shah Alam",
  "PHN Shah Alam 2",
  "PHN Bukit Beruntung",
  "PHN Pegoh",
  "PHN Pekan",
  "PHN Rasa",
  "PHN Fif",
  "DHMSB",
  "OSI Shah Alam",
  "OSI Tanjung Malim",
];

const DEFAULT_DEPARTMENTS = [
  "-",
  "BUSINESS DEVELOPMENT",
  "CEO OFFICE",
  "COSTING AND COMMERCIAL",
  "CULTURE AND TALENT MANAGEMENT",
  "ENERGY MGMT AUTHORITY LIASON",
  "ENERGY SOLUTION",
  "ENGINEERING MANAGEMENT I",
  "ENGINEERING MANAGEMENT II",
  "EQUIPMENT MAINT I - SA 1, SA 2, DHMSB, PEGOH",
  "EQUIPMENT MAINT II - BB, RASA, TM1, TM2",
  "ESG HEALTH AND SAFETY",
  "FACILITY AND ENERGY MANAGEMENT",
  "FINANCE",
  "INVENTORY MGMT AND PLANNING",
  "IT AND DIGITALISATION",
  "MANUFACTURING AND SCM - BB/RASA",
  "MANUFACTURING AND SCM - PEGOH",
  "MANUFACTURING AND SCM - PEKAN",
  "MANUFACTURING AND SCM - SA1",
  "MANUFACTURING AND SCM - SA 2",
  "MANUFACTURING AND SCM - TM 1",
  "MANUFACTURING AND SCM - TM 2",
  "OPERATION I AND IMP",
  "OPERATION II",
  "OPERATION III",
  "OPERATION IV",
  "OPERATIONS",
  "PROCESS ENGINEERING",
  "PROCUREMENT & VENDOR DEV",
  "PROGRAM MANAGEMENT",
  "PROGRAM MANAGEMENT I",
  "PROGRAM MANAGEMENT II",
  "PROGRAM MANAGEMENT III",
  "QMS & SQ",
  "QUALITY ASSURANCE & CONTROL - BB, RASA, TM 1 AND TM 2",
  "QUALITY ASSURANCE & CONTROL SA 1",
  "QUALITY ASSURANCE & CONTROL SA 2",
  "QUALITY ASSURANCE & CONTROL-DEV - MLK PKN",
  "QUALITY DEVELOPMENT",
  "QUALITY MANAGEMENT",
  "QUALITY OPERATIONS",
  "RESEARCH AND DEVELOPMENT",
  "REWARDS AND ADMIN",
  "STRATEGIC BUSINESS PERFORMANCE",
  "TOOLING DESIGN AND DEVELOPMENT",
];

const DEFAULT_REQUEST_TYPES = ["Email - Active Directory", "BAAN Account"];

export const DEFAULT_FORM_OPTIONS: FormOptions = {
  location: DEFAULT_LOCATIONS,
  department: DEFAULT_DEPARTMENTS,
  request_type: DEFAULT_REQUEST_TYPES,
};

export function isFormOptionList(value: unknown): value is FormOptionList {
  return typeof value === "string" && (FORM_OPTION_LISTS as readonly string[]).includes(value);
}

/**
 * Trims each entry and drops blanks; returns an error for duplicates (ignoring case, as the
 * database does), over-long entries, too many entries, or an empty required list.
 */
export function cleanOptionList(list: FormOptionList, raw: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) return { ok: false, error: "Options must be a list of text" };
  const value = (raw as string[]).map((v) => v.trim().replace(/\s+/g, " ")).filter(Boolean);
  const meta = LIST_META[list];
  if (meta.required && value.length === 0) return { ok: false, error: `Keep at least one ${meta.singular}` };
  if (value.length > OPTION_LIST_MAX) return { ok: false, error: `At most ${OPTION_LIST_MAX} ${meta.label.toLowerCase()}` };
  const tooLong = value.find((v) => v.length > OPTION_LABEL_MAX);
  if (tooLong) return { ok: false, error: `"${tooLong.slice(0, 40)}…" is longer than ${OPTION_LABEL_MAX} characters` };
  const seen = new Set<string>();
  for (const v of value) {
    const k = v.toLowerCase();
    if (seen.has(k)) return { ok: false, error: `"${v}" is listed twice` };
    seen.add(k);
  }
  return { ok: true, value };
}
