import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  listAutomationRules,
  setAutomationRuleEnabled,
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

    const rules = await listAutomationRules(merchant.id);
    return NextResponse.json({
      rules: rules.map((r) => ({
        key: r.rule_key,
        title: r.title,
        description: r.description,
        enabled: r.enabled,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  ruleKey: z.string().min(1),
  enabled: z.boolean(),
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
    const rule = await setAutomationRuleEnabled(
      merchant.id,
      body.ruleKey,
      body.enabled,
    );
    return NextResponse.json({ key: rule.rule_key, enabled: rule.enabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
