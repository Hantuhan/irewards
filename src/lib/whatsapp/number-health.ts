/**
 * Health of each merchant's WhatsApp sender number: Meta's quality rating and
 * messaging tier. Fed by the `phone_number_quality_update` webhook and, as a
 * backstop, a periodic poll of the Graph API from the cron.
 *
 * Now that every merchant sends from their own connected number, a rating
 * belongs to one merchant. A bad sender can only damage themselves.
 */

import type { WhatsAppNumberHealthRow } from "@/lib/db/types";
import { adminDb } from "@/lib/db/admin";
import { graphFetch, isWhatsAppDevMode } from "@/lib/meta/client";
import { findMetaConfigForMerchant } from "@/lib/meta/merchant-config";

function db() {
  return adminDb();
}

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** This merchant's number health. Omit the merchant only for platform-level ops. */
export async function getNumberHealth(
  merchantId?: string | null,
): Promise<WhatsAppNumberHealthRow | null> {
  let query = db().from("whatsapp_number_health").select("*");
  if (merchantId) query = query.eq("merchant_id", merchantId);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WhatsAppNumberHealthRow | null) ?? null;
}

async function upsertHealth(patch: Partial<WhatsAppNumberHealthRow> & { phone_number_id: string }) {
  const { error } = await db()
    .from("whatsapp_number_health")
    .upsert([{ ...patch, updated_at: new Date().toISOString() }], { onConflict: "phone_number_id" });
  if (error) throw new Error(error.message);
}

/** Webhook `phone_number_quality_update`, keyed to the number it arrived on. */
export async function applyPhoneQualityEvent(
  value: {
    display_phone_number?: string;
    event?: string;
    current_limit?: string;
  },
  context: { merchantId: string | null; phoneNumberId: string | null } = {
    merchantId: null,
    phoneNumberId: null,
  },
) {
  await upsertHealth({
    phone_number_id: context.phoneNumberId ?? "unknown",
    merchant_id: context.merchantId,
    display_phone_number: value.display_phone_number ?? null,
    messaging_limit: value.current_limit ?? null,
    last_event: value.event ?? null,
    ...(value.event === "FLAGGED" && { quality_rating: "RED" }),
    ...(value.event === "UNFLAGGED" && { quality_rating: "GREEN" }),
  });
}

/** Cron backstop: ask Meta for one merchant's current rating every few hours. */
export async function refreshNumberHealth(
  merchantId: string,
): Promise<{ checked: boolean; quality: string | null }> {
  if (isWhatsAppDevMode()) return { checked: false, quality: null };

  const current = await getNumberHealth(merchantId);
  if (current && Date.now() - new Date(current.updated_at).getTime() < POLL_INTERVAL_MS) {
    return { checked: false, quality: current.quality_rating };
  }

  const config = await findMetaConfigForMerchant(merchantId);
  if (!config) return { checked: false, quality: null };

  const remote = await graphFetch<{
    display_phone_number?: string;
    quality_rating?: string;
    messaging_limit_tier?: string;
  }>(config.phoneNumberId, {
    accessToken: config.accessToken,
    query: { fields: "display_phone_number,quality_rating,messaging_limit_tier" },
  });

  await upsertHealth({
    phone_number_id: config.phoneNumberId,
    merchant_id: merchantId,
    display_phone_number: remote.display_phone_number ?? null,
    quality_rating: remote.quality_rating ?? null,
    messaging_limit: remote.messaging_limit_tier ?? null,
  });
  return { checked: true, quality: remote.quality_rating ?? null };
}

export type NumberHealthSummary = {
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messagingLimit: string | null;
  displayPhoneNumber: string | null;
  updatedAt: string | null;
};

export function summarizeNumberHealth(row: WhatsAppNumberHealthRow | null): NumberHealthSummary {
  const rating = (row?.quality_rating ?? "UNKNOWN").toUpperCase();
  return {
    qualityRating:
      rating === "GREEN" || rating === "YELLOW" || rating === "RED" ? rating : "UNKNOWN",
    messagingLimit: row?.messaging_limit ?? null,
    displayPhoneNumber: row?.display_phone_number ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}
