import { NextResponse } from "next/server";
import { z } from "zod";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { suggestMaxProfitUpsells } from "@/lib/ai/upsell-max-profit";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

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
  candidates: z.array(candidateSchema).min(1).max(80),
  context: z
    .object({
      name: z.string().max(200).optional().nullable(),
      categoryLabel: z.string().max(120).optional().nullable(),
      categorySlug: z.string().max(80).optional().nullable(),
      priceCents: z.number().int().min(0).optional().nullable(),
      tags: z.array(z.string().max(40)).max(20).optional(),
    })
    .optional()
    .nullable(),
  max: z.number().int().min(1).max(8).optional(),
  excludeSlugs: z.array(z.string().min(1).max(120)).max(8).optional(),
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
    const result = await suggestMaxProfitUpsells({
      candidates: body.candidates.map((c) => ({
        slug: c.slug,
        name: c.name,
        categoryLabel: c.categoryLabel ?? undefined,
        categorySlug: c.categorySlug ?? undefined,
        priceCents: c.priceCents ?? undefined,
        tags: c.tags,
        specialTags: c.specialTags,
      })),
      context: body.context
        ? {
            name: body.context.name ?? undefined,
            categoryLabel: body.context.categoryLabel ?? undefined,
            categorySlug: body.context.categorySlug ?? undefined,
            priceCents: body.context.priceCents ?? undefined,
            tags: body.context.tags,
          }
        : undefined,
      max: body.max,
      excludeSlugs: body.excludeSlugs,
    });

    return NextResponse.json({
      links: result.links,
      suggestions: result.suggestions,
      rationale: result.rationale,
      source: result.source,
      configured: isDeepseekConfigured(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to suggest max-profit upsells";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
