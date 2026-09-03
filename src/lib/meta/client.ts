/**
 * Meta WhatsApp Cloud API (Graph API) client.
 *
 * Plain `fetch`, no SDK.
 * Two Meta resources are used:
 *   - the WhatsApp Business Account (WABA) for message templates + approvals
 *   - the phone number id for sending messages
 */

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export type MetaConfig = {
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  appId: string | null;
  appSecret: string | null;
  /** "merchant" when the credentials came from that merchant's connected WABA. */
  source: "merchant" | "platform";
};

/** Dev mode: log instead of calling Meta. Controlled only by WHATSAPP_SKIP_SEND. */
export function isWhatsAppDevMode(): boolean {
  return process.env.WHATSAPP_SKIP_SEND === "true";
}

/**
 * The platform's own WABA, from env.
 *
 * Merchants connect their own account through Embedded Signup and are billed
 * by Meta directly — see `getMetaConfigForMerchant`. This remains for the app
 * credentials (image uploads are an app-level call) and as a fallback for a
 * pilot merchant running on our number before they connect their own.
 */
export function getMetaConfig(): MetaConfig {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const wabaId = process.env.META_WABA_ID;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !wabaId || !phoneNumberId) {
    throw new Error(
      "Missing Meta WhatsApp environment variables (META_ACCESS_TOKEN, META_WABA_ID, META_PHONE_NUMBER_ID)",
    );
  }

  return {
    accessToken,
    wabaId,
    phoneNumberId,
    appId: process.env.META_APP_ID || null,
    appSecret: process.env.META_APP_SECRET || null,
    source: "platform",
  };
}

/** App-level credentials, which exist whether or not a platform WABA is configured. */
export function getMetaAppConfig(): { appId: string | null; appSecret: string | null } {
  return {
    appId: process.env.META_APP_ID || null,
    appSecret: process.env.META_APP_SECRET || null,
  };
}

/** True when a platform-level WABA is configured to fall back to. */
export function hasPlatformWhatsApp(): boolean {
  return Boolean(
    process.env.META_ACCESS_TOKEN &&
      process.env.META_WABA_ID &&
      process.env.META_PHONE_NUMBER_ID,
  );
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | null,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

type GraphInit = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown> | FormData;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  /** The merchant's token. Falls back to the platform token when omitted. */
  accessToken?: string;
};

/** Calls `https://graph.facebook.com/{version}/{path}` and unwraps Meta's error envelope. */
export async function graphFetch<T = Record<string, unknown>>(
  path: string,
  init: GraphInit = {},
): Promise<T> {
  const accessToken = init.accessToken ?? getMetaConfig().accessToken;
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(url, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    body: init.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_user_msg?: string; error_subcode?: number };
  } & Record<string, unknown>;

  if (!response.ok || json.error) {
    const err = json.error ?? {};
    throw new MetaApiError(
      err.error_user_msg || err.message || `Meta API error (${response.status})`,
      response.status,
      err.code ?? null,
      json.error ?? json,
    );
  }

  return json as T;
}

/** Meta wants bare digits (no `+`, no `whatsapp:` prefix). */
export function toMetaPhone(phone: string): string {
  return phone.replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

/** Our customer rows store E.164 with a leading `+`. */
export function fromMetaPhone(waId: string): string {
  const digits = waId.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validates Meta's `X-Hub-Signature-256` header (HMAC-SHA256 of the raw body
 * with the app secret). Uses Web Crypto rather than node:crypto.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  const provided = signatureHeader.replace(/^sha256=/, "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));

  // Constant-time compare; both strings are 64 hex chars here.
  let mismatch = 0;
  for (let i = 0; i < digest.length; i += 1) {
    mismatch |= digest.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export function shouldSkipMetaVerify(): boolean {
  // Never skip based on payment mode — that coupled two unrelated systems.
  return process.env.META_SKIP_VERIFY === "true" && process.env.NODE_ENV !== "production";
}
