import { NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/api/zod-error";
import { getMerchantBySlug, upsertRewardLevels } from "@/lib/db/repository";
import {
  roleDeniedMessage,
  verifyMerchantAccess,
  verifyMerchantRole,
} from "@/lib/merchant/access";
import { normalizeRewardLevels } from "@/lib/loyalty/default-reward-levels";
import { mapRewardLevel } from "@/lib/loyalty/reward-level-map";
import { validateRewardLevels } from "@/lib/loyalty/tiers";

type RouteContext = { params: Promise<{ slug: string }> };

const levelSchema = z.object({
  levelNumber: z.number().int().min(1).max(5),
  name: z.string().min(1),
  minLifetimePoints: z.number().int().min(0),
  pointsMultiplier: z.number().positive(),
  perkDescription: z.string().nullable(),
  nameI18n: z.record(z.string()).optional(),
  perkDescriptionI18n: z.record(z.string()).optional(),
  discountPercent: z.number().min(0).max(100),
  tierActive: z.boolean().optional(),
  pointExpiryDays: z.number().int().min(0).nullable().optional(),
  birthdayPoints: z.number().int().min(0).optional(),
  welcomePoints: z.number().int().min(0).optional(),
  welcomeRewards: z.number().int().min(0).optional(),
  renewPoints: z.number().int().min(0).optional(),
  renewRewards: z.number().int().min(0).optional(),
  validityMonths: z.number().int().min(0).nullable().optional(),
});

const putSchema = z.object({
  levels: z.array(levelSchema),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const langParam = searchParams.get("lang");
    const lang =
      langParam === "zh" || langParam === "ms" || langParam === "en" ? langParam : undefined;

    const { getRewardLevels } = await import("@/lib/db/repository");
    const levels = await getRewardLevels(merchant.id);
    return NextResponse.json({
      merchant: {
        slug: merchant.slug,
        name: merchant.name,
        languages: merchant.languages ?? ["en"],
      },
      levels: normalizeRewardLevels(levels.map((l) => mapRewardLevel(l, lang))),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
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

    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const levels = normalizeRewardLevels(parsed.data.levels);
    const validationError = validateRewardLevels(levels);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const saved = await upsertRewardLevels(
      merchant.id,
      levels.map((l) => ({
        ...l,
        name: l.nameI18n?.en?.trim() || l.name,
        perkDescription: l.perkDescriptionI18n?.en?.trim() || l.perkDescription,
      })),
    );
    return NextResponse.json({ levels: normalizeRewardLevels(saved.map((l) => mapRewardLevel(l))) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
