import { randomInt } from "crypto";

/*
 * Ticket numbers look like TCK-7K3F-9Q2M: eight random characters in two groups of four.
 *
 * They must stay random, not sequential: the requester's ticket page (/tickets/[ticketNumber])
 * opens with the number alone, so the number is what keeps one person's ticket private from
 * another. 31^8 ≈ 850 billion possibilities makes them impractical to guess.
 *
 * The alphabet leaves out characters that are easy to misread or mistype: 0/O, 1/I/L.
 * Tickets created before this format keep their original, longer numbers.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 8;

export function generateTicketNumber(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `TCK-${code.slice(0, 4)}-${code.slice(4)}`;
}

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
