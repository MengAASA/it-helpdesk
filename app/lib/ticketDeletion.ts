import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/app/lib/db";
import { logTicketDeletions } from "@/app/lib/settingsAudit";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/**
 * Deleting a ticket is permanent, so only people with the IAMS admin role can do it (and they still
 * need the "manage tickets" permission, like every other ticket change).
 */
export function canDeleteTickets(role: string, manageTickets: boolean): boolean {
  return role === "admin" && manageTickets;
}

/**
 * Removes the tickets with everything attached to them: notes, history and attachment rows go with
 * the ticket (cascading foreign keys), and the uploaded files are removed from disk afterwards. Each
 * deletion is written to the settings audit log, which keeps no link to the ticket, so the record
 * survives the ticket itself.
 */
export async function deleteTickets(
  ticketNumbers: string[],
  actor: { name: string; email: string }
): Promise<{ deleted: string[]; notFound: string[] }> {
  const rows = await prisma.tickets.findMany({
    where: { ticket_number: { in: ticketNumbers } },
    select: {
      id: true,
      ticket_number: true,
      subject: true,
      name: true,
      attachments: { select: { stored_path: true } },
    },
  });
  const found = new Set(rows.map((r) => r.ticket_number));
  const notFound = ticketNumbers.filter((tn) => !found.has(tn));
  if (rows.length === 0) return { deleted: [], notFound };

  await prisma.tickets.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });

  await logTicketDeletions({
    tickets: rows.map((r) => ({ ticketNumber: r.ticket_number, subject: r.subject, requesterName: r.name })),
    actorName: actor.name,
    actorEmail: actor.email,
  });

  // Files last: the rows are already gone, so a file that can't be removed only wastes disk space.
  for (const row of rows) {
    for (const a of row.attachments) await removeInsideUploads(a.stored_path);
    await removeInsideUploads(path.join(UPLOADS_DIR, row.ticket_number), true);
  }

  return { deleted: rows.map((r) => r.ticket_number), notFound };
}

/** Never touches anything outside the uploads folder, whatever the stored path says. */
async function removeInsideUploads(target: string, recursive = false): Promise<void> {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
  try {
    await rm(resolved, { force: true, recursive });
  } catch (err) {
    console.error(`[delete-ticket] could not remove ${resolved}`, err);
  }
}
