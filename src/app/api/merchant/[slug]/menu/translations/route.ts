import { NextResponse } from "next/server";
import { z } from "zod";
import { applyMenuTranslations } from "@/lib/db/merchant-repository";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const localizedMapSchema = z.record(z.string(), z.string());

const bodySchema = z.object({
  categories: z
    .array(
      z.object({
        slug: z.string().min(1),
        labelI18n: localizedMapSchema,
      }),
    )
    .optional(),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        nameI18n: localizedMapSchema.optional(),
        descriptionI18n: localizedMapSchema.optional(),
        ingredientsI18n: localizedMapSchema.optional(),
        itemNotesI18n: localizedMapSchema.optional(),
      }),
    )
    .optional(),
});

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

    const body = bodySchema.parse(await request.json());
    await applyMenuTranslations(merchant.id, body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save translations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
