import { NextResponse } from "next/server";
import {
  getActiveJoinTokenForOrder,
  getCustomerById,
  getOrderById,
  getRewardLevels,
} from "@/lib/db/repository";
import {
  getOrderItems,
  listActiveMessagingCampaigns,
} from "@/lib/db/merchant-repository";
import { buildJoinOffer, pickWelcomeCampaign } from "@/lib/loyalty/join-offer";
import { buildWhatsAppJoinUrl } from "@/lib/loyalty/join-token";
import { adminDb } from "@/lib/db/admin";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";
import { getStampProgressForCustomer } from "@/lib/services/loyalty-stamps";
import { buildReceiptOrderFromDb } from "@/lib/receipt/build-order-from-db";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: merchant } = await adminDb()
      .from("merchants")
      .select(
        "slug, name, whatsapp_number, currency, logo_url, address, landline_number, registration_number, sst_number, gst_number, receipt_footer_text, receipt_show_registration, receipt_layout_json, service_charge_enabled, service_charge_percent, sst_enabled, sst_rate_percent, gst_enabled, gst_rate_percent",
      )
      .eq("id", order.merchant_id)
      .single();

    const items = await getOrderItems(order.id);

    let tableNumber: string | null = null;
    if (order.venue_table_id) {
      const { data: table } = await adminDb()
        .from("venue_tables")
        .select("table_number")
        .eq("id", order.venue_table_id)
        .single();
      tableNumber = (table as { table_number: string } | null)?.table_number ?? null;
    }

    const joinToken =
      order.status === "paid" ? await getActiveJoinTokenForOrder(order.id) : null;

    const whatsappJoinUrl =
      joinToken && merchant?.whatsapp_number
        ? buildWhatsAppJoinUrl(merchant.whatsapp_number, joinToken)
        : null;

    const [welcomeCampaigns, rewardLevels] = await Promise.all([
      listActiveMessagingCampaigns(order.merchant_id),
      getRewardLevels(order.merchant_id),
    ]);
    const baseLevel = rewardLevels.find((l) => l.level_number === 1) ?? rewardLevels[0];
    const joinOffer = buildJoinOffer({
      campaign: pickWelcomeCampaign(welcomeCampaigns),
      fallbackWelcomePoints: Number(baseLevel?.welcome_points ?? 0),
      merchantName: merchant?.name ?? null,
    });

    let tier = null;
    let stamps = null;
    if (order.customer_id) {
      const customer = await getCustomerById(order.customer_id);
      if (customer?.is_member) {
        const snapshot = await getCustomerTierForMerchant(customer, order.merchant_id);
        tier = {
          levelNumber: snapshot.current.level_number,
          name: snapshot.current.name,
          perkDescription: snapshot.current.perk_description,
          pointsMultiplier: Number(snapshot.current.points_multiplier),
          discountPercent: Number(snapshot.current.discount_percent),
          lifetimePointsEarned: snapshot.lifetimePointsEarned,
          pointsToNextLevel: snapshot.pointsToNextLevel,
          nextLevelName: snapshot.next?.name ?? null,
        };
        const progress = await getStampProgressForCustomer(
          order.merchant_id,
          customer.id,
        );
        if (progress.enabled) {
          stamps = {
            enabled: true,
            filled: progress.filled,
            size: progress.size,
            remaining: progress.remaining,
            rewardLabel: progress.rewardLabel,
            voucher: progress.voucher
              ? {
                  name: progress.voucher.name,
                  code: progress.voucher.code,
                  description: progress.voucher.description,
                }
              : null,
          };
        }
      }
    }

    const receiptItems = items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      modifiers: item.modifiers ?? null,
      note: item.note ?? null,
    }));

    const receiptOrder = merchant
      ? buildReceiptOrderFromDb(
          order,
          merchant,
          receiptItems,
          orderId.slice(0, 8).toUpperCase(),
          tableNumber,
        )
      : null;

    return NextResponse.json({
      order: receiptOrder
        ? {
            id: receiptOrder.id,
            status: receiptOrder.status,
            subtotalCents: receiptOrder.subtotalCents,
            serviceChargeCents: receiptOrder.serviceChargeCents,
            serviceChargeLabel: receiptOrder.serviceChargeLabel,
            taxCents: receiptOrder.taxCents,
            taxLabel: receiptOrder.taxLabel,
            discountCents: receiptOrder.discountCents,
            totalCents: receiptOrder.totalCents,
            paidAt: receiptOrder.paidAt,
            currency: receiptOrder.currency,
            serviceType: receiptOrder.serviceType,
            customerId: order.customer_id,
            items: receiptOrder.items,
          }
        : {
            id: order.id,
            status: order.status,
            subtotalCents: order.subtotal_cents,
            serviceChargeCents: order.service_charge_cents ?? 0,
            serviceChargeLabel: null,
            taxCents: order.tax_cents ?? 0,
            taxLabel: order.tax_label ?? null,
            discountCents: order.discount_cents,
            totalCents: order.total_cents,
            paidAt: order.paid_at,
            currency: "MYR",
            serviceType: order.service_type ?? "dine_in",
            customerId: order.customer_id,
            items: receiptItems,
          },
      merchant: merchant
        ? {
            name: merchant.name,
            slug: merchant.slug,
            logoUrl: merchant.logo_url ?? null,
            address: merchant.address ?? null,
            landlineNumber: merchant.landline_number ?? null,
            registrationNumber: merchant.registration_number ?? null,
            sstNumber: merchant.sst_number ?? null,
            gstNumber: merchant.gst_number ?? null,
            receiptFooterText: merchant.receipt_footer_text ?? null,
            receiptShowRegistration: merchant.receipt_show_registration ?? true,
            receiptLayout: merchant.receipt_layout_json ?? null,
          }
        : null,
      tableNumber,
      joinToken,
      whatsappJoinUrl,
      joinOffer,
      tier,
      stamps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
