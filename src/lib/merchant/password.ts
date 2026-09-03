import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export {
  PASSWORD_POLICY,
  validatePasswordStrength,
  assertPasswordStrength,
} from "@/lib/auth/password-policy";

/** scrypt with explicit cost parameters (N=16384, r=8, p=1). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyLegacy(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    if (!Number.isFinite(N) || !salt.length || !expected.length) return false;
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
  return verifyLegacy(password, stored);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    const pad = Buffer.alloc(Math.max(aBuf.length, 1));
    timingSafeEqual(aBuf.length ? aBuf : pad, pad);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

