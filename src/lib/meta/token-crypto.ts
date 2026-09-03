/**
 * Encryption for merchant WhatsApp access tokens.
 *
 * These tokens send messages billed to the merchant's own Meta account, so a
 * database dump must not hand over the ability to message their customers.
 * AES-256-GCM, one random IV per token, auth tag stored alongside.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function key(): Buffer {
  const secret =
    process.env.WHATSAPP_TOKEN_KEY ??
    process.env.MERCHANT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-whatsapp-token-key");

  if (!secret) {
    throw new Error(
      "WHATSAPP_TOKEN_KEY (or MERCHANT_SESSION_SECRET) is required in production to store WhatsApp tokens",
    );
  }
  // The env value is a passphrase of any length; AES-256 needs exactly 32 bytes.
  return createHash("sha256").update(`${secret}:whatsapp-token`).digest();
}

/** `iv.ciphertext.tag`, all base64url. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), encrypted.toString("base64url"), tag.toString("base64url")].join(
    ".",
  );
}

/** Returns null rather than throwing — a token we cannot read is a reconnect prompt, not a crash. */
export function decryptToken(cipherText: string): string | null {
  try {
    const [ivPart, dataPart, tagPart] = cipherText.split(".");
    if (!ivPart || !dataPart || !tagPart) return null;

    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
