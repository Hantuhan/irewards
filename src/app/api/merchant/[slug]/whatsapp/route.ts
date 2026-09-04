import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  disconnectWhatsAppAccount,
  getWhatsAppAccount,
  summarizeWhatsAppAccount,
  upsertWhatsAppAccount,
} from "@/lib/db/whatsapp-account-repository";
import {
  roleDeniedMessage,
  verifyMerchantAccess,
  verifyMerchantRole,
} from "@/lib/merchant/access";
import { getMetaAppConfig, graphFetch, isWhatsAppDevMode } from "@/lib/meta/client";
import { getNumberHealth, summarizeNumberHealth } from "@/lib/whatsapp/number-health";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Connecting a merchant's own WhatsApp Business Account (Meta Embedded Signup).
 *
 * The browser runs Meta's signup dialog, which hands back a short-lived
 * authorization `code` plus the WABA and phone number the merchant picked.
 * Everything after that happens here, because the exchange needs the app
 * secret and the resulting token must never reach the browser.
 */

const connectSchema = z.object({
  /** Authorization code from the Embedded Signup dialog. Valid for 30 seconds. */
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  /** Meta Business the WABA sits under. Returned by Embedded Signup v4. */
  businessId: z.string().min(1).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    const account = await getWhatsAppAccount(merchant.id);
    const health = account ? await getNumberHealth(merchant.id).catch(() => null) : null;

    return NextResponse.json({
      account: summarizeWhatsAppAccount(account),
      numberHealth: summarizeNumberHealth(health),
      // The browser needs these to launch the dialog.
      appId: getMetaAppConfig().appId,
      configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
      devMode: isWhatsAppDevMode(),
    });
  } catch (error) {
    console.error("WhatsApp account read failed:", error);
    return NextResponse.json({ error: "Could not load WhatsApp status" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await verifyMerchantRole(request, slug, "owner"))) {
      return NextResponse.json({ error: roleDeniedMessage("owner") }, { status: 403 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    const body = connectSchema.parse(await request.json());
    const { appId, appSecret } = getMetaAppConfig();
    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: "WhatsApp sign-up is not configured on this server yet (META_APP_ID / META_APP_SECRET)." },
        { status: 503 },
      );
    }

    // 1. Trade the one-time code for the merchant's business token.
    const token = await graphFetch<{ access_token?: string }>("oauth/access_token", {
      method: "GET",
      query: {
        client_id: appId,
        client_secret: appSecret,
        code: body.code,
      },
      // This call authenticates with the code itself, not a bearer token.
      accessToken: appSecret,
    });
    if (!token.access_token) {
      return NextResponse.json(
        { error: "WhatsApp sign-in did not complete. Please try connecting again." },
        { status: 400 },
      );
    }
    const accessToken = token.access_token;

    // 2. Subscribe our app to the merchant's WABA so their webhooks reach us.
    await graphFetch(`${body.wabaId}/subscribed_apps`, {
      method: "POST",
      accessToken,
    });

    // 3. Register the number for Cloud API sending. Already-registered numbers
    //    return an error we can safely ignore — reconnecting is normal.
    await graphFetch(`${body.phoneNumberId}/register`, {
      method: "POST",
      accessToken,
      body: { messaging_product: "whatsapp", pin: sixDigitPin(merchant.id) },
    }).catch((err) => {
      console.warn("WhatsApp number register skipped:", err instanceof Error ? err.message : err);
    });

    // 4. Read back what the merchant actually connected, for the dashboard.
    const details = await graphFetch<{
      display_phone_number?: string;
      verified_name?: string;
    }>(body.phoneNumberId, {
      accessToken,
      query: { fields: "display_phone_number,verified_name" },
    }).catch(() => ({}) as { display_phone_number?: string; verified_name?: string });

    const account = await upsertWhatsAppAccount({
      merchantId: merchant.id,
      wabaId: body.wabaId,
      phoneNumberId: body.phoneNumberId,
      accessToken,
      displayPhoneNumber: details.display_phone_number ?? null,
      verifiedName: details.verified_name ?? null,
      businessId: body.businessId ?? null,
    });

    return NextResponse.json({ ok: true, account: summarizeWhatsAppAccount(account) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "WhatsApp sign-up returned an unexpected result." }, { status: 400 });
    }
    console.error("WhatsApp connect failed:", error);
    const message =
      error instanceof Error
        ? `Could not connect WhatsApp: ${error.message}`
        : "Could not connect WhatsApp";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await verifyMerchantRole(request, slug, "owner"))) {
      return NextResponse.json({ error: roleDeniedMessage("owner") }, { status: 403 });
    }
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });

    await disconnectWhatsAppAccount(merchant.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp disconnect failed:", error);
    return NextResponse.json({ error: "Could not disconnect WhatsApp" }, { status: 500 });
  }
}

/**
 * Cloud API registration wants a 6-digit PIN. It is only used for two-step
 * verification on re-registration, so it is derived from the merchant id
 * rather than asked for — one less thing for a cafe owner to lose.
 */
function sixDigitPin(merchantId: string): string {
  let hash = 0;
  for (const char of merchantId) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000;
  return String(hash).padStart(6, "0");
}
