import { prisma } from "@/app/lib/db";

/** A link to another IT system. Shown on the admin "Other systems" page and in the IAMS sidebar. */
export type SystemLink = {
  id: number;
  name: string;
  url: string;
  description: string | null;
};

export const NAME_MAX = 80;
export const URL_MAX = 500;
export const DESCRIPTION_MAX = 200;

/** Only people with the IAMS admin role can add, edit or remove links; everyone signed in can see them. */
export function canManageSystemLinks(role: string): boolean {
  return role === "admin";
}

export async function getSystemLinks(): Promise<SystemLink[]> {
  const rows = await prisma.system_links.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] });
  return rows.map((r) => ({ id: r.id, name: r.name, url: r.url, description: r.description }));
}

export type SystemLinkInput = { name: string; url: string; description: string | null };

/**
 * Checks and tidies what an admin typed. The address must be http(s): anything else (javascript:,
 * data:, file:) is refused, because the link is rendered as a clickable href in both systems.
 * A bare host such as "portal.phn.com.my" gets https:// in front.
 */
export function parseSystemLinkInput(body: unknown): { ok: true; value: SystemLinkInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const rawUrl = typeof b.url === "string" ? b.url.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";

  if (!name) return { ok: false, error: "Give the link a name" };
  if (name.length > NAME_MAX) return { ok: false, error: `Name can be at most ${NAME_MAX} characters` };
  if (!rawUrl) return { ok: false, error: "Add the link's address" };
  if (description.length > DESCRIPTION_MAX) return { ok: false, error: `Description can be at most ${DESCRIPTION_MAX} characters` };

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid web address" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// addresses are allowed" };
  }
  const url = parsed.toString();
  if (url.length > URL_MAX) return { ok: false, error: `Address can be at most ${URL_MAX} characters` };

  return { ok: true, value: { name, url, description: description || null } };
}
