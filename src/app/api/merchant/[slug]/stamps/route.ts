import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getStampProgram,
  serializeStampProgram,
  upsertStampProgram,
} from "@/lib/db/stamps-repository";
import { listMenuCategories, listMenuItems } from "@/lib/db/merchant-repository";
import { updateMerchant } from "@/lib/db/merchant-repository";
import { STAMP_SIZE_PRESETS } from "@/lib/loyalty/stamps";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const putSchema = z.object({
  enabled: z.boolean().optional(),
  cardSize: z.number().int().min(2).max(20),
  rewardType: z.enum(["free_item", "percent_off", "fixed_off"]),
  rewardLabel: z.string().trim().min(1).max(80),
  rewardMenuItemId: z.string().uuid().nullable().optional(),
  rewardPercent: z.number().positive().max(100).nullable().optional(),
  rewardCents: z.number().int().min(0).nullable().optional(),
  qualifyingMenuItemIds: z.array(z.string().uuid()).default([]),
  qualifyingCategoryIds: z.array(z.string().uuid()).default([]),
  maxStampsPerOrder: z.number().int().positive().nullable().optional(),
  maxStampsPerDay: z.number().int().positive().nullable().optional(),
  cartNudgeEnabled: z.boolean().optional(),
});

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

    const [programRow, categories, items] = await Promise.all([
      getStampProgram(merchant.id),
      listMenuCategories(merchant.id),
      listMenuItems(merchant.id),
    ]);

    return NextResponse.json({
      enabled: Boolean(merchant.stamps_program_enabled),
      pointsProgramEnabled: merchant.points_program_enabled !== false,
      presets: STAMP_SIZE_PRESETS,
      program: programRow
        ? serializeStampProgram(programRow)
        : {
            cardSize: 6,
            rewardType: "free_item" as const,
            rewardLabel: "Free drink",
            rewardMenuItemId: null,
            rewardPercent: null,
            rewardCents: null,
            qualifyingMenuItemIds: [] as string[],
            qualifyingCategoryIds: [] as string[],
            maxStampsPerOrder: null,
            maxStampsPerDay: null,
            cartNudgeEnabled: true,
          },
      menu: {
        categories: categories.map((c) => ({ id: c.id, label: c.label })),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          categoryId: i.category_id,
          priceCents: i.price_cents,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stamps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = putSchema.parse(await request.json());

    if (
      body.qualifyingMenuItemIds.length === 0 &&
      body.qualifyingCategoryIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Pick at least one qualifying item or category" },
        { status: 400 },
      );
    }

    if (body.enabled !== undefined) {
      await updateMerchant(merchant.id, {
        stamps_program_enabled: body.enabled,
      });
    }

    const programRow = await upsertStampProgram(merchant.id, {
      cardSize: body.cardSize,
      rewardType: body.rewardType,
      rewardLabel: body.rewardLabel,
      rewardMenuItemId: body.rewardMenuItemId ?? null,
      rewardPercent: body.rewardPercent ?? null,
      rewardCents: body.rewardCents ?? null,
      qualifyingMenuItemIds: body.qualifyingMenuItemIds,
      qualifyingCategoryIds: body.qualifyingCategoryIds,
      maxStampsPerOrder: body.maxStampsPerOrder ?? null,
      maxStampsPerDay: body.maxStampsPerDay ?? null,
      cartNudgeEnabled: body.cartNudgeEnabled !== false,
    });

    const updated = await getMerchantBySlug(slug);

    return NextResponse.json({
      enabled: Boolean(updated?.stamps_program_enabled),
      program: serializeStampProgram(programRow),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to save stamps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
