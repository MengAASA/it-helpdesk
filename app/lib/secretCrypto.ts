import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is not set. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must decode to exactly 32 bytes (a base64-encoded 256-bit key).");
  }
  return key;
}

/** Encrypts a secret for storage. Safe to call with an already-encrypted value (no-op). */
export function encryptSecret(plain: string): string {
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/**
 * Decrypts a secret read from storage. Values without the `enc:v1:` prefix are
 * treated as legacy plaintext (written before encryption was added) and returned
 * as-is — they get re-encrypted automatically the next time they're saved.
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [ivB64, authTagB64, ciphertextB64] = stored.slice(PREFIX.length).split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
