import { NextResponse } from "next/server";
import { z } from "zod";
import { completeProductWithAi } from "@/lib/ai/complete-product-intelligence";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const presetSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  group: z.string().min(1).max(80),
});

const candidateSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  categoryLabel: z.string().max(120).optional().nullable(),
  categorySlug: z.string().max(80).optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  specialTags: z.array(z.string().max(40)).max(20).optional(),
});

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  priceCents: z.number().int().min(0),
  categorySlug: z.string().max(80).optional().nullable(),
  categoryLabel: z.string().max(120).optional().nullable(),
  productKind: z.enum(["drink", "food"]).default("food"),
  description: z.string().max(500).optional().nullable(),
  availablePresets: z.array(presetSchema).max(80).default([]),
  upsellCandidates: z.array(candidateSchema).max(80).default([]),
  targetLanguages: z.array(z.enum(["zh", "ms"])).max(2).optional(),
  availableTakeaway: z.boolean().optional(),
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

    const body = bodySchema.parse(await request.json());
    const result = await completeProductWithAi({
      name: body.name,
      priceCents: body.priceCents,
      categorySlug: body.categorySlug ?? undefined,
      categoryLabel: body.categoryLabel ?? undefined,
      productKind: body.productKind,
      description: body.description,
      availablePresets: body.availablePresets,
      upsellCandidates: body.upsellCandidates.map((c) => ({
        slug: c.slug,
        name: c.name,
        categoryLabel: c.categoryLabel ?? undefined,
        categorySlug: c.categorySlug ?? undefined,
        priceCents: c.priceCents ?? undefined,
        tags: c.tags,
        specialTags: c.specialTags,
      })),
      targetLanguages: body.targetLanguages,
      availableTakeaway: body.availableTakeaway,
    });

    return NextResponse.json({
      ...result,
      configured: isDeepseekConfigured(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to complete product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
