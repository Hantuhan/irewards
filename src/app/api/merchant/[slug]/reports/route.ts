import { NextResponse } from "next/server";
import { z } from "zod";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getMerchantSalesReport } from "@/lib/db/merchant-repository";
import { verifyMerchantAccess } from "@/lib/merchant/access";

type RouteContext = { params: Promise<{ slug: string }> };

const querySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
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

    const { searchParams } = new URL(request.url);
    const { period } = querySchema.parse({
      period: searchParams.get("period") ?? "daily",
    });

    const report = await getMerchantSalesReport(
      merchant.id,
      period,
      merchant.timezone ?? "Asia/Kuala_Lumpur",
    );

    return NextResponse.json({
      currency: merchant.currency,
      ...report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sales report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
