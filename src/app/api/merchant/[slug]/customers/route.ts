import { NextResponse } from "next/server";
import { z } from "zod";
import {
  awardPointsToCustomer,
  createMemberCustomer,
  getCustomerByPhone,
  getMerchantBySlug,
  getRewardLevels,
  updateCustomer,
} from "@/lib/db/repository";
import { listCustomersForMerchant } from "@/lib/db/merchant-repository";
import { listRecentMemberFeedback } from "@/lib/db/member-feedback-repository";
import { getStampProgram, serializeStampProgram } from "@/lib/db/stamps-repository";
import { isPlausiblePhone, normalizePhone } from "@/lib/loyalty/phone";
import { resolveCustomerLevel } from "@/lib/loyalty/tiers";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { staffAdjustStamps } from "@/lib/services/loyalty-stamps";
import { sendWhatsAppMessage } from "@/lib/whatsapp/outbound";
import type { CustomerRow } from "@/lib/db/types";

type RouteContext = { params: Promise<{ slug: string }> };

function memberPayload(customer: CustomerRow, levels: Awaited<ReturnType<typeof getRewardLevels>>) {
  const tier = resolveCustomerLevel(customer.lifetime_points_earned, levels);
  return {
    id: customer.id,
    name:
      customer.display_name ??
      (customer.phone ? `Member ${customer.phone.slice(-4)}` : "Guest"),
    phone: customer.phone,
    tier: tier.name,
    points: customer.points_balance,
    lifetimePoints: customer.lifetime_points_earned,
    isMember: customer.is_member,
    lastVisit: customer.last_visit_at,
  };
}

function parseBirthday(value: string | undefined): {
  month: number | null;
  day: number | null;
} {
  if (!value?.trim()) return { month: null, day: null };
  const trimmed = value.trim();
  // dd/mm or dd/mm/yyyy
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  // yyyy-mm-dd from <input type="date">
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  return { month: null, day: null };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    if (url.searchParams.get("enrollMeta") === "1") {
      const [levels, programRow] = await Promise.all([
        getRewardLevels(merchant.id),
        getStampProgram(merchant.id),
      ]);
      const program = programRow ? serializeStampProgram(programRow) : null;
      const baseLevel = levels.find((l) => l.level_number === 1) ?? levels[0] ?? null;
      return NextResponse.json({
        merchant: {
          name: merchant.name,
          currency: merchant.currency,
          stampsEnabled: Boolean(merchant.stamps_program_enabled),
        },
        levels: levels
          .filter((l) => l.tier_active !== false)
          .sort((a, b) => a.level_number - b.level_number)
          .map((l) => ({
            levelNumber: l.level_number,
            name: l.name,
            perkDescription: l.perk_description,
            pointsMultiplier: Number(l.points_multiplier),
            minLifetimePoints: l.min_lifetime_points,
            welcomePoints: l.welcome_points ?? 0,
          })),
        defaultWelcomePoints: Number(baseLevel?.welcome_points ?? 50) || 50,
        stampCardSize: program?.cardSize ?? 8,
      });
    }

    const search = url.searchParams.get("q") ?? undefined;

    const [customers, levels, feedback] = await Promise.all([
      listCustomersForMerchant(merchant.id, search),
      getRewardLevels(merchant.id),
      listRecentMemberFeedback(merchant.id, 25),
    ]);

    return NextResponse.json({
      members: customers.map((c) => memberPayload(c, levels)),
      feedback: feedback.map((f) => ({
        id: f.id,
        rating: f.rating,
        note: f.note,
        createdAt: f.created_at,
        memberName: f.customers?.display_name ?? null,
        phone: f.customers?.phone ?? null,
        needsFollowUp: f.rating >= 1 && f.rating <= 4,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(80),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  birthday: z.string().trim().max(32).optional().default(""),
  staffNotes: z.string().trim().max(2000).optional().default(""),
  levelNumber: z.number().int().min(1).max(5).optional().default(1),
  initialPoints: z.number().int().min(0).max(100_000).optional().default(0),
  initialStamps: z.number().int().min(0).max(20).optional().default(0),
  sendWhatsAppInvite: z.boolean().optional().default(false),
  birthdayAutomation: z.boolean().optional().default(true),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = postSchema.parse(await request.json());
    const phone = normalizePhone(body.phone);
    if (!isPlausiblePhone(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number (e.g. +60123456789)" },
        { status: 400 },
      );
    }

    const displayName = body.name.trim();
    const email = body.email?.trim() ? body.email.trim() : null;
    const birthday = parseBirthday(body.birthday);
    if (body.birthday?.trim() && birthday.month == null) {
      return NextResponse.json(
        { error: "Birthday must be dd/mm or dd/mm/yyyy" },
        { status: 400 },
      );
    }

    const levels = await getRewardLevels(merchant.id);
    const selectedLevel =
      levels.find((l) => l.level_number === body.levelNumber) ??
      levels.find((l) => l.level_number === 1) ??
      levels[0];
    if (!selectedLevel) {
      return NextResponse.json({ error: "No reward levels configured" }, { status: 400 });
    }

    const existing = await getCustomerByPhone(merchant.id, phone);
    let customer: CustomerRow;

    if (existing?.is_member) {
      return NextResponse.json(
        { error: "A member with this phone number already exists" },
        { status: 409 },
      );
    }

    const profilePatch = {
      display_name: displayName,
      email,
      birthday_month: birthday.month,
      birthday_day: birthday.day,
      staff_notes: body.staffNotes.trim() || null,
    };

    if (existing) {
      customer = await updateCustomer(existing.id, {
        is_member: true,
        ...profilePatch,
      });
    } else {
      customer = await createMemberCustomer({
        merchantId: merchant.id,
        phone,
        displayName,
        email,
        birthdayMonth: birthday.month,
        birthdayDay: birthday.day,
        staffNotes: body.staffNotes.trim() || null,
      });
    }

    if (body.initialPoints > 0) {
      customer = await awardPointsToCustomer({
        customer,
        orderId: null,
        points: body.initialPoints,
        reason: "staff_enroll_welcome",
      });
      customer = await updateCustomer(customer.id, { first_join_bonus_awarded: true });
    }

    const minLifetime = selectedLevel.min_lifetime_points;
    if (customer.lifetime_points_earned < minLifetime) {
      customer = await updateCustomer(customer.id, {
        lifetime_points_earned: minLifetime,
      });
    }

    if (body.initialStamps > 0 && merchant.stamps_program_enabled) {
      await staffAdjustStamps({
        customer,
        merchantId: merchant.id,
        delta: body.initialStamps,
        reason: "staff_enroll",
      });
    }

    let whatsappSent = false;
    let whatsappWarning: string | null = null;
    if (body.sendWhatsAppInvite) {
      const voucherHint = merchant.name
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toUpperCase()
        .slice(0, 4);
      const code = `${voucherHint || "IRW"}${String(Math.floor(Math.random() * 900) + 100)}`;
      const message = [
        `☕ Welcome to iRewards at ${merchant.name}!`,
        "",
        `Hello ${displayName},`,
        "",
        `Your digital membership pass is primed with ${body.initialPoints} welcome points.`,
        body.initialPoints > 0
          ? `Use code ${code} for a welcome treat on your next visit (ask staff).`
          : "Show this message next time you're in — staff can look up your membership.",
        "",
        "Reply STOP to opt out of marketing.",
      ].join("\n");

      try {
        await sendWhatsAppMessage(merchant.id, phone, message);
        whatsappSent = true;
      } catch (err) {
        whatsappWarning =
          err instanceof Error
            ? err.message
            : "Member saved, but WhatsApp invite could not be sent";
      }
    }

    return NextResponse.json(
      {
        member: memberPayload(customer, levels),
        whatsappSent,
        whatsappWarning,
        birthdayAutomation: body.birthdayAutomation,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
