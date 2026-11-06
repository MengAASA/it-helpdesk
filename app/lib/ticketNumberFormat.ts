/*
 * Ticket-number formatting that is safe to use in the browser (no Node `crypto`). Generation lives
 * in ticketNumber.ts, which re-exports this.
 */

/**
 * Tidies a ticket number someone typed: trims it, upper-cases it, and puts the dashes back in a
 * new-style number typed without them ("tck 7k3f9q2m" → "TCK-7K3F-9Q2M"). Older numbers are
 * already upper-case, so they still match after this.
 */
export function normalizeTicketNumber(input: string): string {
  const value = input.trim().toUpperCase();
  const short = value.replace(/[\s-]/g, "").match(/^TCK([A-Z0-9]{4})([A-Z0-9]{4})$/);
  return short ? `TCK-${short[1]}-${short[2]}` : value;
}

/**
 * Like normalizeTicketNumber, but also accepts just the eight characters after "TCK-", the way
 * people often type them ("7k3f 9q2m" → "TCK-7K3F-9Q2M"). For the requester-facing lookup boxes.
 */
export function expandTicketInput(input: string): string {
  const compact = input.replace(/[\s-]/g, "");
  return normalizeTicketNumber(/^[a-z0-9]{8}$/i.test(compact) ? `TCK${compact}` : input);
}
