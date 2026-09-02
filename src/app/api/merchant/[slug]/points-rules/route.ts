import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  createPointsRule,
  deletePointsRule,
  listPointsRules,
  updatePointsRule,
} from "@/lib/db/points-rules-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const conditionSchema = z.object({
  field: z.enum(["member_tier", "day_of_week"]),
  operator: z.enum(["is", "is_not"]),
  value: z.string().min(1),
});

const itemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string().min(1),
});

const ruleBodySchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "inactive"]),
  pointsMultiplier: z.number().positive(),
  mainConditions: z.array(conditionSchema),
  itemConditions: z.array(itemSchema),
});

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

    const rules = await listPointsRules(merchant.id);
    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load points rules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = ruleBodySchema.parse(await request.json());
    const rule = await createPointsRule(merchant.id, body);
    return NextResponse.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = ruleBodySchema.partial().extend({
  ruleId: z.string().uuid(),
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
    const { ruleId, ...patch } = body;
    const rule = await updatePointsRule(merchant.id, ruleId, patch);
    return NextResponse.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteSchema = z.object({ ruleId: z.string().uuid() });

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!verifyMerchantAccess(request, slug)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const body = deleteSchema.parse(await request.json());
    await deletePointsRule(merchant.id, body.ruleId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
