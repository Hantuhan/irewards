/**
 * Fixed-window rate limiting for unauthenticated storefront endpoints.
 *
 * Promo validation and member lookup both answer "does this value exist?" for
 * an attacker-supplied value. Without a limit, promo codes can be guessed and
 * Malaysian mobile numbers walked one by one, for free.
 *
 * Backed by the database rather than memory because the app runs as isolated
 * serverless instances — an in-process counter would reset constantly and
 * limit nothing.
 */

import { adminDb } from "@/lib/db/admin";

function db() {
  return adminDb();
}

export type RateLimitResult = {
  allowed: boolean;
  /** Requests left in this window. */
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * The caller's address. Cloudflare's header is authoritative when present;
 * `x-forwarded-for` can be spoofed, so it is only a fallback and the limit is
 * never the sole defence.
 */
export function requestIdentifier(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function windowStart(windowSeconds: number): string {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(Date.now() / ms) * ms).toISOString();
}

/**
 * Counts one request against `bucket`/`identifier`.
 *
 * Two round trips rather than an atomic increment, so a burst of simultaneous
 * requests can slip one or two over the limit. That is fine for slowing abuse
 * down; it is not a quota system.
 *
 * Never throws — a limiter that failed closed would take checkout down with it.
 */
export async function checkRateLimit(input: {
  bucket: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { bucket, identifier, limit, windowSeconds } = input;
  const start = windowStart(windowSeconds);
  const retryAfterSeconds = Math.ceil(
    (new Date(start).getTime() + windowSeconds * 1000 - Date.now()) / 1000,
  );

  try {
    const { data, error } = await db()
      .from("rate_limits")
      .select("hits")
      .eq("bucket", bucket)
      .eq("identifier", identifier)
      .eq("window_start", start)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const hits = Number((data as { hits?: number } | null)?.hits ?? 0) + 1;

    const { error: writeError } = await db()
      .from("rate_limits")
      .upsert([{ bucket, identifier, window_start: start, hits }], {
        onConflict: "bucket,identifier,window_start",
      });
    if (writeError) throw new Error(writeError.message);

    return {
      allowed: hits <= limit,
      remaining: Math.max(0, limit - hits),
      retryAfterSeconds,
    };
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return { allowed: true, remaining: limit, retryAfterSeconds };
  }
}

/** 429 with a plain-words message and the standard header. */
export function rateLimitedResponse(retryAfterSeconds: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(Math.max(1, retryAfterSeconds)),
    },
  });
}
