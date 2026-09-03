import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createPromo,
  listPromos,
  updatePromo,
} from "@/lib/db/merchant-repository";
import { promoDeactivateBlocker } from "@/lib/campaigns/campaign-voucher";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

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
        campaignId: p.campaign_id ?? null,
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
  /** Null means unlimited — only sensible for a code that never leaves the counter. */
  usageLimit: z.number().int().positive().nullable().optional(),
  perCustomerLimit: z.number().int().positive().nullable().optional(),
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
    const promo = await createPromo(merchant.id, {
      name: body.name,
      code: body.code.toUpperCase(),
      type: body.type,
      value: body.value,
      minSpendCents: body.minSpendCents ?? null,
      expiresAt: body.expiresAt ?? null,
      usageLimit: body.usageLimit ?? null,
      // A shared code with no per-member cap can be farmed by one person, so
      // the form defaults this to 1 and only an explicit null lifts it.
      perCustomerLimit: body.perCustomerLimit === undefined ? 1 : body.perCustomerLimit,
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
    if (!(await verifyMerchantAccess(request, slug))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());

    if (body.active === false) {
      const blocker = await promoDeactivateBlocker(merchant.id, body.promoId);
      if (blocker) {
        return NextResponse.json({ error: blocker }, { status: 409 });
      }
    }

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
