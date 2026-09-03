import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { updateMerchant } from "@/lib/db/merchant-repository";
import { listGlobalUpsellLinks, replaceGlobalUpsells } from "@/lib/db/global-upsell-repository";
import { defaultUpsellLink, type UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import {
  roleDeniedMessage,
  verifyMerchantAccess,
  verifyMerchantRole,
} from "@/lib/merchant/access";
import { syncTaxFlagsForCurrency } from "@/lib/merchant/charge-settings";
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

const languageCode = z.enum(["en", "zh", "ms"]);

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
  logoUrl: z.union([z.string().min(1), z.literal("")]).nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  languages: z.array(languageCode).min(1).optional(),
  registrationNumber: z.string().nullable().optional(),
  sstNumber: z.string().nullable().optional(),
  gstNumber: z.string().nullable().optional(),
  landlineNumber: z.string().nullable().optional(),
  retentionEnabled: z.boolean().optional(),
  campaignSendWindowStart: z
    .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal(""), z.null()])
    .optional(),
  campaignSendWindowEnd: z
    .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal(""), z.null()])
    .optional(),
  campaignSendCapHours: z.number().int().min(0).max(168).optional(),
  birthdayBonusPoints: z.number().int().min(0).optional(),
  pointsExpiryDays: z.number().int().min(0).optional(),
  pointsRedeemCentsPerPoint: z.number().int().positive().optional(),
  serviceChargeEnabled: z.boolean().optional(),
  serviceChargePercent: z.number().min(0).max(100).optional(),
  sstEnabled: z.boolean().optional(),
  sstRatePercent: z.number().min(0).max(100).optional(),
  gstEnabled: z.boolean().optional(),
  gstRatePercent: z.number().min(0).max(100).optional(),
  receiptFooterText: z.string().nullable().optional(),
  receiptShowRegistration: z.boolean().optional(),
  receiptLayout: z.unknown().nullable().optional(),
  refundPolicy: z.string().nullable().optional(),
  privacyPolicy: z.string().nullable().optional(),
  dailyRevenueTarget: z.number().min(0).nullable().optional(),
  weeklyRevenueTarget: z.number().min(0).nullable().optional(),
  monthlyRevenueTarget: z.number().min(0).nullable().optional(),
  halalCertified: z.boolean().nullable().optional(),
  halalCertificateUrl: z.union([z.string().min(1), z.literal("")]).nullable().optional(),
  globalUpsellItemSlugs: z.array(z.string().min(1)).max(8).optional(),
  globalUpsellLinks: z
    .array(
      z.object({
        slug: z.string().min(1),
        suggestType: z.enum(["upsell", "downsell"]).default("upsell"),
        promoMode: z.enum(["regular", "free", "custom"]).default("regular"),
        promoPriceCents: z.number().int().min(0).optional(),
        ruleType: z.enum(["always", "min_cart", "max_cart"]).default("always"),
        minCartCents: z.number().int().min(0).optional(),
        maxCartCents: z.number().int().min(0).optional(),
        priority: z.number().int().default(10),
      }),
    )
    .max(8)
    .optional(),
  membershipSetupCompleted: z.boolean().optional(),
  pointsProgramEnabled: z.boolean().optional(),
  stampsProgramEnabled: z.boolean().optional(),
});

function toNullable(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  return value.trim();
}

function merchantSettingsResponse(
  merchant: Awaited<ReturnType<typeof getMerchantBySlug>>,
  globalUpsellLinks: UpsellLinkConfig[] = [],
) {
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
    logoUrl: merchant.logo_url ?? null,
    address: merchant.address ?? null,
    latitude: merchant.latitude != null ? Number(merchant.latitude) : null,
    longitude: merchant.longitude != null ? Number(merchant.longitude) : null,
    languages: merchant.languages ?? ["en"],
    registrationNumber: merchant.registration_number ?? null,
    sstNumber: merchant.sst_number ?? null,
    gstNumber: merchant.gst_number ?? null,
    landlineNumber: merchant.landline_number ?? null,
    retentionEnabled: merchant.retention_enabled !== false,
    campaignSendWindowStart: merchant.campaign_send_window_start
      ? String(merchant.campaign_send_window_start).slice(0, 5)
      : null,
    campaignSendWindowEnd: merchant.campaign_send_window_end
      ? String(merchant.campaign_send_window_end).slice(0, 5)
      : null,
    campaignSendCapHours: Number(merchant.campaign_send_cap_hours ?? 48),
    birthdayBonusPoints: Number(merchant.birthday_bonus_points ?? 50),
    pointsExpiryDays: Number(merchant.points_expiry_days ?? 0),
    pointsRedeemCentsPerPoint: Number(merchant.points_redeem_cents_per_point ?? 10),
    serviceChargeEnabled: merchant.service_charge_enabled ?? false,
    serviceChargePercent: Number(merchant.service_charge_percent ?? 10),
    sstEnabled: merchant.sst_enabled ?? false,
    sstRatePercent: Number(merchant.sst_rate_percent ?? 6),
    gstEnabled: merchant.gst_enabled ?? false,
    gstRatePercent: Number(merchant.gst_rate_percent ?? 9),
    receiptFooterText: merchant.receipt_footer_text ?? null,
    receiptShowRegistration: merchant.receipt_show_registration ?? true,
    receiptLayout: merchant.receipt_layout_json ?? null,
    refundPolicy: merchant.refund_policy ?? null,
    privacyPolicy: merchant.privacy_policy ?? null,
    dailyRevenueTargetCents: merchant.daily_revenue_target_cents ?? null,
    weeklyRevenueTargetCents: merchant.weekly_revenue_target_cents ?? null,
    monthlyRevenueTargetCents: merchant.monthly_revenue_target_cents ?? null,
    halalCertified: merchant.halal_certified ?? null,
    halalCertificateUrl: merchant.halal_certificate_url ?? null,
    globalUpsellLinks,
    globalUpsellItemSlugs: globalUpsellLinks.map((link) => link.slug),
    membershipSetupCompleted: Boolean(merchant.membership_setup_completed_at),
    pointsProgramEnabled: merchant.points_program_enabled !== false,
    stampsProgramEnabled: Boolean(merchant.stamps_program_enabled),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }
    const globalUpsellLinks = await listGlobalUpsellLinks(merchant.id);
    return NextResponse.json(merchantSettingsResponse(merchant, globalUpsellLinks));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await verifyMerchantRole(request, slug, "owner"))) {
      return NextResponse.json({ error: roleDeniedMessage("owner") }, { status: 403 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());

    if (body.halalCertified === true && !toNullable(body.halalCertificateUrl ?? undefined)) {
      return NextResponse.json(
        { error: "Upload your halal certificate when declaring Halal certified" },
        { status: 400 },
      );
    }

    const taxFlags =
      body.currency !== undefined ? syncTaxFlagsForCurrency(body.currency) : null;
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
      ...(body.logoUrl !== undefined && { logo_url: toNullable(body.logoUrl) }),
      ...(body.address !== undefined && { address: toNullable(body.address) }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.languages !== undefined && { languages: body.languages }),
      ...(body.registrationNumber !== undefined && {
        registration_number: toNullable(body.registrationNumber),
      }),
      ...(body.sstNumber !== undefined && {
        sst_number: toNullable(body.sstNumber),
      }),
      ...(body.gstNumber !== undefined && {
        gst_number: toNullable(body.gstNumber),
      }),
      ...(body.landlineNumber !== undefined && {
        landline_number: toNullable(body.landlineNumber),
      }),
      ...(body.retentionEnabled !== undefined && {
        retention_enabled: body.retentionEnabled,
      }),
      ...(body.campaignSendWindowStart !== undefined && {
        campaign_send_window_start: body.campaignSendWindowStart
          ? body.campaignSendWindowStart.length === 5
            ? `${body.campaignSendWindowStart}:00`
            : body.campaignSendWindowStart
          : null,
      }),
      ...(body.campaignSendWindowEnd !== undefined && {
        campaign_send_window_end: body.campaignSendWindowEnd
          ? body.campaignSendWindowEnd.length === 5
            ? `${body.campaignSendWindowEnd}:00`
            : body.campaignSendWindowEnd
          : null,
      }),
      ...(body.campaignSendCapHours !== undefined && {
        campaign_send_cap_hours: body.campaignSendCapHours,
      }),
      ...(body.birthdayBonusPoints !== undefined && {
        birthday_bonus_points: body.birthdayBonusPoints,
      }),
      ...(body.pointsExpiryDays !== undefined && {
        points_expiry_days: body.pointsExpiryDays,
      }),
      ...(body.pointsRedeemCentsPerPoint !== undefined && {
        points_redeem_cents_per_point: body.pointsRedeemCentsPerPoint,
      }),
      ...(body.serviceChargeEnabled !== undefined && {
        service_charge_enabled: body.serviceChargeEnabled,
      }),
      ...(body.serviceChargePercent !== undefined && {
        service_charge_percent: body.serviceChargePercent,
      }),
      ...(body.sstEnabled !== undefined
        ? { sst_enabled: body.sstEnabled }
        : taxFlags && { sst_enabled: taxFlags.sstEnabled }),
      ...(body.sstRatePercent !== undefined && { sst_rate_percent: body.sstRatePercent }),
      ...(body.gstEnabled !== undefined
        ? { gst_enabled: body.gstEnabled }
        : taxFlags && { gst_enabled: taxFlags.gstEnabled }),
      ...(body.gstRatePercent !== undefined && { gst_rate_percent: body.gstRatePercent }),
      ...(body.receiptFooterText !== undefined && {
        receipt_footer_text: toNullable(body.receiptFooterText),
      }),
      ...(body.receiptShowRegistration !== undefined && {
        receipt_show_registration: body.receiptShowRegistration,
      }),
      ...(body.receiptLayout !== undefined && {
        receipt_layout_json: body.receiptLayout,
      }),
      ...(body.refundPolicy !== undefined && {
        refund_policy: toNullable(body.refundPolicy),
      }),
      ...(body.privacyPolicy !== undefined && {
        privacy_policy: toNullable(body.privacyPolicy),
      }),
      ...(body.dailyRevenueTarget !== undefined && {
        daily_revenue_target_cents:
          body.dailyRevenueTarget != null ? Math.round(body.dailyRevenueTarget * 100) : null,
      }),
      ...(body.weeklyRevenueTarget !== undefined && {
        weekly_revenue_target_cents:
          body.weeklyRevenueTarget != null ? Math.round(body.weeklyRevenueTarget * 100) : null,
      }),
      ...(body.monthlyRevenueTarget !== undefined && {
        monthly_revenue_target_cents:
          body.monthlyRevenueTarget != null ? Math.round(body.monthlyRevenueTarget * 100) : null,
      }),
      ...(body.halalCertified !== undefined && { halal_certified: body.halalCertified }),
      ...(body.halalCertificateUrl !== undefined && {
        halal_certificate_url: toNullable(body.halalCertificateUrl),
      }),
      ...(body.halalCertified === false && { halal_certificate_url: null }),
      ...(body.membershipSetupCompleted !== undefined && {
        membership_setup_completed_at: body.membershipSetupCompleted
          ? new Date().toISOString()
          : null,
      }),
      ...(body.pointsProgramEnabled !== undefined && {
        points_program_enabled: body.pointsProgramEnabled,
      }),
      ...(body.stampsProgramEnabled !== undefined && {
        stamps_program_enabled: body.stampsProgramEnabled,
      }),
    });

    if (body.globalUpsellLinks !== undefined) {
      await replaceGlobalUpsells(merchant.id, body.globalUpsellLinks);
    } else if (body.globalUpsellItemSlugs !== undefined) {
      await replaceGlobalUpsells(
        merchant.id,
        body.globalUpsellItemSlugs.map((slug) => defaultUpsellLink(slug)),
      );
    }

    const globalUpsellLinks = await listGlobalUpsellLinks(merchant.id);
    return NextResponse.json(merchantSettingsResponse(updated, globalUpsellLinks));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
