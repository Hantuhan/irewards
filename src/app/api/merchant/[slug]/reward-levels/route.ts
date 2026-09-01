import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug, upsertRewardLevels } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";
import { validateRewardLevels } from "@/lib/loyalty/tiers";

type RouteContext = { params: Promise<{ slug: string }> };

const levelSchema = z.object({
  levelNumber: z.number().int().min(1).max(5),
  name: z.string().min(1),
  minLifetimePoints: z.number().int().min(0),
  pointsMultiplier: z.number().positive(),
  perkDescription: z.string().nullable(),
  discountPercent: z.number().min(0).max(100),
});

const putSchema = z.object({
  levels: z.array(levelSchema).length(5),
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const { getRewardLevels } = await import("@/lib/db/repository");
    const levels = await getRewardLevels(merchant.id);
    return NextResponse.json({
      merchant: { slug: merchant.slug, name: merchant.name },
      levels: levels.map((level) => ({
        levelNumber: level.level_number,
        name: level.name,
        minLifetimePoints: level.min_lifetime_points,
        pointsMultiplier: Number(level.points_multiplier),
        perkDescription: level.perk_description,
        discountPercent: Number(level.discount_percent),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = putSchema.parse(await request.json());
    const validationError = validateRewardLevels(body.levels);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const levels = await upsertRewardLevels(merchant.id, body.levels);
    return NextResponse.json({
      levels: levels.map((level) => ({
        levelNumber: level.level_number,
        name: level.name,
        minLifetimePoints: level.min_lifetime_points,
        pointsMultiplier: Number(level.points_multiplier),
        perkDescription: level.perk_description,
        discountPercent: Number(level.discount_percent),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
