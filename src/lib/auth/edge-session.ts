/**
 * Edge-safe HMAC session verification for middleware (Web Crypto).
 * Matches Node createHmac("sha256").update(payload).digest("base64url") format.
 */

function secretFor(kind: "merchant" | "platform"): string {
  if (kind === "platform") {
    return (
      process.env.PLATFORM_SESSION_SECRET ||
      process.env.MERCHANT_SESSION_SECRET ||
      (process.env.NODE_ENV === "production" ? "" : "irewards-dev-platform-session")
    );
  }
  return (
    process.env.MERCHANT_SESSION_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "irewards-dev-session-secret")
  );
}

function b64urlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToB64url(sig);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifySignedSessionToken(
  token: string,
  kind: "merchant" | "platform",
): Promise<Record<string, unknown> | null> {
  const secret = secretFor(kind);
  if (!secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await hmacSign(payload, secret);
  if (!timingSafeEqualStr(expected, signature)) return null;
  try {
    const json = new TextDecoder().decode(b64urlToBytes(payload));
    const session = JSON.parse(json) as { exp?: number } & Record<string, unknown>;
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
