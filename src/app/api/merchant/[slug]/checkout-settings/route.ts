import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { merchantChargeSettingsFromRow } from "@/lib/services/order-totals";

type RouteContext = { params: Promise<{ slug: string }> };

/** Public storefront charge settings (service charge, SST/GST) for cart and receipt previews. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const charges = merchantChargeSettingsFromRow(merchant);

    return NextResponse.json({
      currency: merchant.currency,
      serviceChargeEnabled: charges.serviceChargeEnabled,
      serviceChargePercent: charges.serviceChargePercent,
      sstEnabled: charges.sstEnabled,
      sstRatePercent: charges.sstRatePercent,
      gstEnabled: charges.gstEnabled,
      gstRatePercent: charges.gstRatePercent,
      receiptFooterText: merchant.receipt_footer_text ?? null,
      receiptShowRegistration: merchant.receipt_show_registration ?? true,
      receiptLayout: merchant.receipt_layout_json ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load checkout settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
