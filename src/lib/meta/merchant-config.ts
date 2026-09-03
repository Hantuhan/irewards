/**
 * Which WhatsApp account a merchant sends from.
 *
 * Preference order:
 *   1. The merchant's own WABA, connected through Embedded Signup. Meta bills
 *      them, and their quality rating is theirs alone.
 *   2. The platform WABA from env, if one is configured. This exists so a
 *      pilot merchant can run on our number before connecting their own — it
 *      is not the steady state, because one bad sender on a shared number gets
 *      it restricted for everyone on it.
 */

import { getMetaConfig, hasPlatformWhatsApp, type MetaConfig } from "@/lib/meta/client";
import { getMerchantWhatsAppCredentials } from "@/lib/db/whatsapp-account-repository";

export class WhatsAppNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppNotConnectedError";
  }
}

/** Null when this merchant cannot send at all. */
export async function findMetaConfigForMerchant(
  merchantId: string,
): Promise<MetaConfig | null> {
  const own = await getMerchantWhatsAppCredentials(merchantId);
  if (own) {
    const { appId, appSecret } = metaAppFields();
    return {
      accessToken: own.accessToken,
      wabaId: own.wabaId,
      phoneNumberId: own.phoneNumberId,
      appId,
      appSecret,
      source: "merchant",
    };
  }

  if (hasPlatformWhatsApp()) return getMetaConfig();
  return null;
}

/** As above, but throws a message the merchant can act on. */
export async function getMetaConfigForMerchant(merchantId: string): Promise<MetaConfig> {
  const config = await findMetaConfigForMerchant(merchantId);
  if (!config) {
    throw new WhatsAppNotConnectedError(
      "WhatsApp is not connected for this store yet. Open Settings → WhatsApp and connect your WhatsApp Business account.",
    );
  }
  return config;
}

function metaAppFields(): { appId: string | null; appSecret: string | null } {
  return {
    appId: process.env.META_APP_ID || null,
    appSecret: process.env.META_APP_SECRET || null,
  };
}
