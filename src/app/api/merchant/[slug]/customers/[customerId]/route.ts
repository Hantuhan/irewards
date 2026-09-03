import { NextResponse } from "next/server";
import { z } from "zod";
import {
  awardPointsToCustomer,
  getMerchantBySlug,
  getRewardLevels,
  updateCustomer,
} from "@/lib/db/repository";
import {
  createPromo,
  getMemberDetailForMerchant,
  getPromoById,
} from "@/lib/db/merchant-repository";
import { recordManualVoucherIssue } from "@/lib/db/automation-repository";
import { resolveCustomerLevel } from "@/lib/loyalty/tiers";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import type { CustomerRow } from "@/lib/db/types";
import { staffAdjustStamps } from "@/lib/services/loyalty-stamps";
import { getStampProgressForCustomer } from "@/lib/services/loyalty-stamps";

type RouteContext = { params: Promise<{ slug: string; customerId: string }> };

function memberName(customer: CustomerRow) {
  return (
    customer.display_name ??
    (customer.phone ? `Member ${customer.phone.slice(-4)}` : "Guest")
  );
}

function parseBirthday(value: string | undefined): {
  month: number | null;
  day: number | null;
  error?: string;
} {
  if (!value?.trim()) return { month: null, day: null };
  const trimmed = value.trim();
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  return { month: null, day: null, error: "Birthday must be dd/mm or dd/mm/yyyy" };
}

function serializeDetail(
  detail: NonNullable<Awaited<ReturnType<typeof getMemberDetailForMerchant>>>,
  levels: Awaited<ReturnType<typeof getRewardLevels>>,
  currency: "MYR" | "SGD",
  stamps?: Awaited<ReturnType<typeof getStampProgressForCustomer>> | null,
) {
  const { customer } = detail;
  const tier = resolveCustomerLevel(customer.lifetime_points_earned, levels);
  return {
    member: {
      id: customer.id,
      name: memberName(customer),
      phone: customer.phone,
      email: customer.email,
      birthdayMonth: customer.birthday_month ?? null,
      birthdayDay: customer.birthday_day ?? null,
      staffNotes: customer.staff_notes ?? null,
      tier: tier.name,
      points: customer.points_balance,
      lifetimePoints: customer.lifetime_points_earned,
      isMember: customer.is_member,
      blocked: customer.marketing_opt_out,
      memberSince: customer.created_at ?? null,
      lastVisit: customer.last_visit_at,
      lifetimeSpendCents: detail.lifetimeSpendCents,
      totalVisits: detail.totalVisits,
      currency,
      stampsCollected: stamps?.stampsCollected ?? 0,
      stampCardSize: stamps?.size ?? null,
      stampPendingReward: stamps?.pendingReward ?? false,
      stampsEnabled: stamps?.enabled ?? false,
    },
    activity: detail.activity,
    vouchers: detail.vouchers,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug, customerId } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const [detail, levels, stamps] = await Promise.all([
      getMemberDetailForMerchant(merchant.id, customerId, merchant.currency),
      getRewardLevels(merchant.id),
      getStampProgressForCustomer(merchant.id, customerId),
    ]);

    if (!detail) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDetail(detail, levels, merchant.currency, stamps));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_points"),
    points: z.number().int().min(1).max(100_000),
    reason: z.string().trim().max(120).optional(),
  }),
  z.object({
    action: z.literal("adjust_stamps"),
    delta: z.number().int().min(-20).max(20),
    reason: z.string().trim().max(120).optional(),
  }),
  z.object({
    action: z.literal("edit_profile"),
    name: z.string().trim().min(1, "Full name is required").max(80),
    phone: z.string().trim().min(1, "Phone is required").max(32),
    email: z.string().trim().email().nullable().optional().or(z.literal("")),
    birthday: z.string().trim().max(32).optional().default(""),
    staffNotes: z.string().trim().max(2000).optional().default(""),
  }),
  z.object({
    action: z.literal("block"),
    blocked: z.boolean(),
  }),
  z.object({
    action: z.literal("issue_voucher"),
    promoId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_and_issue_voucher"),
    name: z.string().trim().min(1).max(80),
    type: z.enum(["percentage", "fixed"]).default("percentage"),
    value: z.number().positive().max(1000),
    expiryDays: z.number().int().min(1).max(365).default(14),
  }),
]);

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug, customerId } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    let detail = await getMemberDetailForMerchant(merchant.id, customerId, merchant.currency);
    if (!detail) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (body.action === "add_points") {
      await awardPointsToCustomer({
        customer: detail.customer,
        orderId: null,
        points: body.points,
        reason: body.reason?.trim() || "manual_adjustment",
      });
    } else if (body.action === "adjust_stamps") {
      if (body.delta === 0) {
        return NextResponse.json({ error: "Delta cannot be zero" }, { status: 400 });
      }
      await staffAdjustStamps({
        customer: detail.customer,
        merchantId: merchant.id,
        delta: body.delta,
        reason: body.reason,
      });
    } else if (body.action === "edit_profile") {
      const phone = normalizePhone(body.phone);
      if (!isPlausiblePhone(phone)) {
        return NextResponse.json(
          { error: "Enter a valid phone number (e.g. +60123456789)" },
          { status: 400 },
        );
      }
      const birthday = parseBirthday(body.birthday);
      if (birthday.error) {
        return NextResponse.json({ error: birthday.error }, { status: 400 });
      }
      await updateCustomer(customerId, {
        display_name: body.name.trim(),
        phone,
        email: body.email && body.email !== "" ? body.email.trim() : null,
        birthday_month: birthday.month,
        birthday_day: birthday.day,
        staff_notes: body.staffNotes.trim() || null,
      });
    } else if (body.action === "block") {
      await updateCustomer(customerId, { marketing_opt_out: body.blocked });
    } else if (body.action === "issue_voucher") {
      const promo = await getPromoById(merchant.id, body.promoId);
      if (!promo) {
        return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
      }
      if (!promo.active) {
        return NextResponse.json({ error: "Voucher is not active" }, { status: 400 });
      }
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return NextResponse.json({ error: "Voucher has expired" }, { status: 400 });
      }
      await recordManualVoucherIssue({
        merchantId: merchant.id,
        customerId,
        promoId: promo.id,
        code: promo.code,
        promoName: promo.name,
      });
    } else if (body.action === "create_and_issue_voucher") {
      const codeBase =
        body.name.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 8) || "VOUCHER";
      const code = `${codeBase}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const expiresAt = new Date(
        Date.now() + body.expiryDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const promo = await createPromo(merchant.id, {
        name: body.name,
        code,
        type: body.type,
        value: body.value,
        minSpendCents: null,
        expiresAt,
      });
      await recordManualVoucherIssue({
        merchantId: merchant.id,
        customerId,
        promoId: promo.id,
        code: promo.code,
        promoName: promo.name,
      });
    }

    detail = await getMemberDetailForMerchant(merchant.id, customerId, merchant.currency);
    if (!detail) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const [levels, stamps] = await Promise.all([
      getRewardLevels(merchant.id),
      getStampProgressForCustomer(merchant.id, customerId),
    ]);
    return NextResponse.json(serializeDetail(detail, levels, merchant.currency, stamps));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
