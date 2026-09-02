/**
 * Health of the WhatsApp sender number: Meta's quality rating and messaging
 * tier. Fed by the `phone_number_quality_update` webhook and, as a backstop,
 * a daily poll of the Graph API from the cron.
 */

import type { WhatsAppNumberHealthRow } from "@/lib/db/types";
import { createInsforgeAdmin } from "@/lib/insforge/client";
import { getMetaConfig, graphFetch, isWhatsAppDevMode } from "@/lib/meta/client";

function db() {
  return createInsforgeAdmin().database;
}

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function getNumberHealth(): Promise<WhatsAppNumberHealthRow | null> {
  const { data, error } = await db()
    .from("whatsapp_number_health")
    .select("*")
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

/** Webhook `phone_number_quality_update`. */
export async function applyPhoneQualityEvent(value: {
  display_phone_number?: string;
  event?: string;
  current_limit?: string;
}) {
  let phoneNumberId = "unknown";
  try {
    phoneNumberId = getMetaConfig().phoneNumberId;
  } catch {
    /* dev without Meta env — still record the event */
  }
  await upsertHealth({
    phone_number_id: phoneNumberId,
    display_phone_number: value.display_phone_number ?? null,
    messaging_limit: value.current_limit ?? null,
    last_event: value.event ?? null,
    ...(value.event === "FLAGGED" && { quality_rating: "RED" }),
    ...(value.event === "UNFLAGGED" && { quality_rating: "GREEN" }),
  });
}

/** Cron backstop: ask Meta for the number's current rating every few hours. */
export async function refreshNumberHealth(): Promise<{ checked: boolean; quality: string | null }> {
  if (isWhatsAppDevMode()) return { checked: false, quality: null };

  const current = await getNumberHealth();
  if (current && Date.now() - new Date(current.updated_at).getTime() < POLL_INTERVAL_MS) {
    return { checked: false, quality: current.quality_rating };
  }

  const { phoneNumberId } = getMetaConfig();
  const remote = await graphFetch<{
    display_phone_number?: string;
    quality_rating?: string;
    messaging_limit_tier?: string;
  }>(phoneNumberId, { query: { fields: "display_phone_number,quality_rating,messaging_limit_tier" } });

  await upsertHealth({
    phone_number_id: phoneNumberId,
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
