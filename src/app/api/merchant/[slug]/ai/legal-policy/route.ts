import { NextResponse } from "next/server";
import { z } from "zod";
import { draftLegalPolicy } from "@/lib/ai/legal-policy-intelligence";
import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  policyType: z.enum(["refund", "privacy"]),
  prompt: z.string().max(2000),
  existingText: z.string().max(20000).optional(),
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
    const result = await draftLegalPolicy({
      merchantName: merchant.name,
      currency: merchant.currency,
      storeEmail: merchant.store_email,
      policyType: body.policyType,
      prompt: body.prompt,
      existingText: body.existingText,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI draft failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
