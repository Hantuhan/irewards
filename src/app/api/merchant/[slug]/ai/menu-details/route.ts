import { NextResponse } from "next/server";
import { z } from "zod";
import { askMenuDetails } from "@/lib/ai/menu-details-intelligence";
import { isDeepseekConfigured } from "@/lib/ai/deepseek";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const presetSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  group: z.string().min(1).max(80),
});

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  categorySlug: z.string().max(80).optional().nullable(),
  categoryLabel: z.string().max(120).optional().nullable(),
  productKind: z.enum(["drink", "food"]).default("food"),
  availablePresets: z.array(presetSchema).max(80).default([]),
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
    const result = await askMenuDetails({
      name: body.name,
      description: body.description,
      categorySlug: body.categorySlug ?? undefined,
      categoryLabel: body.categoryLabel ?? undefined,
      productKind: body.productKind,
      availablePresets: body.availablePresets,
    });

    return NextResponse.json({
      ...result,
      configured: isDeepseekConfigured(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to auto-generate details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
