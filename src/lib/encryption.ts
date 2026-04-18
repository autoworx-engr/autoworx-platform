import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX_LENGTH = 64;

/**
 * Returns the AES-256-GCM key as a 32-byte Buffer.
 * The key is read from `META_TOKEN_ENCRYPTION_KEY` and must be a 64-character
 * hex string (32 bytes). Generate one with:
 *   `openssl rand -hex 32`
 *
 * @throws If the env var is missing or the wrong length
 */
function getKey(): Buffer {
  const hex = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY must be a 64-char hex string");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plain-text string with AES-256-GCM.
 *
 * The output format is `ivHex:authTagHex:ciphertextHex` — a single
 * colon-separated string containing all material needed to decrypt.
 * The IV is randomly generated per call, so the same input produces different
 * ciphertext each time (semantically secure).
 *
 * @param text - Plain-text string to encrypt
 * @returns Colon-separated encrypted string: `iv:authTag:ciphertext`
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a string produced by {@link encrypt}.
 *
 * @param encryptedText - Colon-separated string `iv:authTag:ciphertext`
 * @returns Original plain-text string
 * @throws If the data is tampered (GCM authentication tag mismatch) or malformed
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
