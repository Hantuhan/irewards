/**
 * Simple in-memory login throttle (per process).
 * On Cloudflare Workers, replace with KV/Durable Object later.
 */

type Bucket = { failures: number; firstAt: number; lockedUntil: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

export function assertLoginAllowed(key: string): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) return;
  if (b.lockedUntil > now) {
    const mins = Math.ceil((b.lockedUntil - now) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${mins} minute(s).`);
  }
  if (now - b.firstAt > WINDOW_MS) {
    buckets.delete(key);
  }
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.firstAt > WINDOW_MS) {
    buckets.set(key, { failures: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  b.failures += 1;
  if (b.failures >= MAX_FAILURES) {
    b.lockedUntil = now + LOCK_MS;
  }
}

export function recordLoginSuccess(key: string): void {
  buckets.delete(key);
}
