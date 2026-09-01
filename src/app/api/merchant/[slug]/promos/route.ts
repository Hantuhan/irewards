import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createPromo,
  listPromos,
  updatePromo,
} from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const promos = await listPromos(merchant.id);
    return NextResponse.json({
      promos: promos.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        type: p.type,
        value: Number(p.value),
        minSpendCents: p.min_spend_cents,
        expiresAt: p.expires_at,
        active: p.active,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load promos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(2).max(32),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  minSpendCents: z.number().int().min(0).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
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
    const promo = await createPromo(merchant.id, {
      name: body.name,
      code: body.code.toUpperCase(),
      type: body.type,
      value: body.value,
      minSpendCents: body.minSpendCents ?? null,
      expiresAt: body.expiresAt ?? null,
    });

    return NextResponse.json({ id: promo.id, code: promo.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  promoId: z.string().uuid(),
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  value: z.number().positive().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const promo = await updatePromo(merchant.id, body.promoId, {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.value !== undefined && { value: body.value }),
    });

    return NextResponse.json({ id: promo.id, active: promo.active });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
