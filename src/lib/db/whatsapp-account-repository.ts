/**
 * Merchant ↔ WhatsApp Business Account links, created by Embedded Signup.
 *
 * The access token is encrypted at rest, so nothing here returns a row with a
 * readable token except `getMerchantWhatsAppCredentials`, which is the only
 * function allowed to decrypt.
 */

import { adminDb } from "@/lib/db/admin";
import { decryptToken, encryptToken } from "@/lib/meta/token-crypto";

function db() {
  return adminDb();
}

export type WhatsAppAccountRow = {
  id: string;
  merchant_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  business_id: string | null;
  access_token_cipher: string;
  status: "connected" | "disconnected" | "invalid";
  last_error: string | null;
  connected_at: string;
  updated_at: string;
};

/** Safe to send to the dashboard — no token. */
export type WhatsAppAccountSummary = {
  connected: boolean;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: WhatsAppAccountRow["status"] | null;
  lastError: string | null;
  connectedAt: string | null;
};

const SAFE_FIELDS =
  "id, merchant_id, waba_id, phone_number_id, display_phone_number, verified_name, business_id, status, last_error, connected_at, updated_at";

export function summarizeWhatsAppAccount(
  row: Omit<WhatsAppAccountRow, "access_token_cipher"> | null,
): WhatsAppAccountSummary {
  if (!row) {
    return {
      connected: false,
      wabaId: null,
      phoneNumberId: null,
      displayPhoneNumber: null,
      verifiedName: null,
      status: null,
      lastError: null,
      connectedAt: null,
    };
  }
  return {
    connected: row.status === "connected",
    wabaId: row.waba_id,
    phoneNumberId: row.phone_number_id,
    displayPhoneNumber: row.display_phone_number,
    verifiedName: row.verified_name,
    status: row.status,
    lastError: row.last_error,
    connectedAt: row.connected_at,
  };
}

export async function getWhatsAppAccount(
  merchantId: string,
): Promise<Omit<WhatsAppAccountRow, "access_token_cipher"> | null> {
  const { data, error } = await db()
    .from("whatsapp_accounts")
    .select(SAFE_FIELDS)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Omit<WhatsAppAccountRow, "access_token_cipher"> | null) ?? null;
}

/**
 * Which merchant owns the number a webhook arrived on.
 *
 * This is the correct way to route inbound messages: the sender's phone number
 * is not a merchant key — one person can be a member at several cafes.
 */
export async function getMerchantIdByPhoneNumberId(
  phoneNumberId: string,
): Promise<string | null> {
  const { data, error } = await db()
    .from("whatsapp_accounts")
    .select("merchant_id")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { merchant_id: string } | null)?.merchant_id ?? null;
}

/** Decrypted credentials. Only the Meta client should call this. */
export async function getMerchantWhatsAppCredentials(merchantId: string): Promise<{
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
} | null> {
  const { data, error } = await db()
    .from("whatsapp_accounts")
    .select("waba_id, phone_number_id, access_token_cipher, status")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as Pick<
    WhatsAppAccountRow,
    "waba_id" | "phone_number_id" | "access_token_cipher" | "status"
  > | null;
  if (!row || row.status !== "connected") return null;

  const accessToken = decryptToken(row.access_token_cipher);
  if (!accessToken) {
    // The key rotated or the row is corrupt. Flag it so the merchant is asked
    // to reconnect rather than watching sends fail silently.
    await markWhatsAppAccountInvalid(
      merchantId,
      "Stored WhatsApp token could not be read. Reconnect WhatsApp in Settings.",
    );
    return null;
  }

  return { wabaId: row.waba_id, phoneNumberId: row.phone_number_id, accessToken };
}

/** Called after Embedded Signup completes. Re-connecting replaces the old link. */
export async function upsertWhatsAppAccount(input: {
  merchantId: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  businessId?: string | null;
}): Promise<Omit<WhatsAppAccountRow, "access_token_cipher">> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("whatsapp_accounts")
    .upsert(
      [
        {
          merchant_id: input.merchantId,
          waba_id: input.wabaId,
          phone_number_id: input.phoneNumberId,
          display_phone_number: input.displayPhoneNumber ?? null,
          verified_name: input.verifiedName ?? null,
          business_id: input.businessId ?? null,
          access_token_cipher: encryptToken(input.accessToken),
          status: "connected",
          last_error: null,
          connected_at: now,
          updated_at: now,
        },
      ],
      { onConflict: "merchant_id" },
    )
    .select(SAFE_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return data as Omit<WhatsAppAccountRow, "access_token_cipher">;
}

export async function markWhatsAppAccountInvalid(
  merchantId: string,
  reason: string,
): Promise<void> {
  const { error } = await db()
    .from("whatsapp_accounts")
    .update({ status: "invalid", last_error: reason, updated_at: new Date().toISOString() })
    .eq("merchant_id", merchantId);
  if (error) console.error("Failed to flag WhatsApp account invalid:", error.message);
}

export async function disconnectWhatsAppAccount(merchantId: string): Promise<void> {
  const { error } = await db()
    .from("whatsapp_accounts")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("merchant_id", merchantId);
  if (error) throw new Error(error.message);
}

/** Every merchant the cron should poll for template verdicts and number health. */
export async function listConnectedWhatsAppMerchantIds(): Promise<string[]> {
  const { data, error } = await db()
    .from("whatsapp_accounts")
    .select("merchant_id")
    .eq("status", "connected");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => (row as { merchant_id: string }).merchant_id);
}
