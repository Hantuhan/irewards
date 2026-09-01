import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { updateMerchant } from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { z } from "zod";

type RouteContext = { params: Promise<{ slug: string }> };

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .nullable()
  .optional();

const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .nullable()
  .optional();

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  whatsappNumber: z.string().nullable().optional(),
  currency: z.enum(["MYR", "SGD"]).optional(),
  pointsPerRinggit: z.number().positive().optional(),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  googleUrl: optionalUrl,
  xhsUrl: optionalUrl,
  websiteUrl: optionalUrl,
  storeEmail: optionalEmail,
  googleReviewDelayMinutes: z.number().int().min(5).max(1440).optional(),
  bounceBackDiscountPercent: z.number().min(1).max(100).optional(),
  bounceBackExpiryDays: z.number().int().min(1).max(90).optional(),
});

function toNullable(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  return value.trim();
}

function merchantSettingsResponse(merchant: Awaited<ReturnType<typeof getMerchantBySlug>>) {
  if (!merchant) throw new Error("Merchant not found");
  return {
    name: merchant.name,
    slug: merchant.slug,
    currency: merchant.currency,
    whatsappNumber: merchant.whatsapp_number,
    pointsPerRinggit: Number(merchant.points_per_ringgit ?? 0.1),
    facebookUrl: merchant.facebook_url ?? null,
    instagramUrl: merchant.instagram_url ?? null,
    googleUrl: merchant.google_url ?? null,
    xhsUrl: merchant.xhs_url ?? null,
    websiteUrl: merchant.website_url ?? null,
    storeEmail: merchant.store_email ?? null,
    googleReviewDelayMinutes: Number(merchant.google_review_delay_minutes ?? 30),
    bounceBackDiscountPercent: Number(merchant.bounce_back_discount_percent ?? 20),
    bounceBackExpiryDays: Number(merchant.bounce_back_expiry_days ?? 14),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }
    return NextResponse.json(merchantSettingsResponse(merchant));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const updated = await updateMerchant(merchant.id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.whatsappNumber !== undefined && { whatsapp_number: body.whatsappNumber }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.pointsPerRinggit !== undefined && {
        points_per_ringgit: body.pointsPerRinggit,
      }),
      ...(body.facebookUrl !== undefined && { facebook_url: toNullable(body.facebookUrl) }),
      ...(body.instagramUrl !== undefined && { instagram_url: toNullable(body.instagramUrl) }),
      ...(body.googleUrl !== undefined && { google_url: toNullable(body.googleUrl) }),
      ...(body.xhsUrl !== undefined && { xhs_url: toNullable(body.xhsUrl) }),
      ...(body.websiteUrl !== undefined && { website_url: toNullable(body.websiteUrl) }),
      ...(body.storeEmail !== undefined && { store_email: toNullable(body.storeEmail) }),
      ...(body.googleReviewDelayMinutes !== undefined && {
        google_review_delay_minutes: body.googleReviewDelayMinutes,
      }),
      ...(body.bounceBackDiscountPercent !== undefined && {
        bounce_back_discount_percent: body.bounceBackDiscountPercent,
      }),
      ...(body.bounceBackExpiryDays !== undefined && {
        bounce_back_expiry_days: body.bounceBackExpiryDays,
      }),
    });

    return NextResponse.json(merchantSettingsResponse(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
