import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  getMerchantIngredientPresetsRaw,
  saveMerchantIngredientPresets,
} from "@/lib/db/merchant-repository";
import {
  addIngredientPresetToCatalog,
  mergeStandardIngredientPresets,
} from "@/lib/menu/menu-ingredients";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const postSchema = z.object({
  label: z.string().min(1).max(80),
  group: z.string().min(1).max(40),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = postSchema.parse(await request.json());
    const catalog = mergeStandardIngredientPresets(
      await getMerchantIngredientPresetsRaw(merchant.id),
    );
    const { catalog: next, preset } = addIngredientPresetToCatalog(catalog, body);
    await saveMerchantIngredientPresets(merchant.id, next);

    return NextResponse.json({ preset, presets: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add ingredient";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
