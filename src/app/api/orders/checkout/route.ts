import { z } from "zod";
import { NextResponse } from "next/server";
import {
  createPendingOrder,
  getCustomerById,
  getMerchantBySlug,
  getRewardLevels,
  getVenueTable,
} from "@/lib/db/repository";
import {
  createOrderItems,
  getPromoByCode,
  recordPromoRedemption,
  resolveMenuItemsForCheckout,
} from "@/lib/db/merchant-repository";
import { createHitPayPaymentRequest, isDevPaymentMode } from "@/lib/payments/hitpay";
import { applyLevelDiscount, resolveCustomerLevel } from "@/lib/loyalty/tiers";
import { calculatePromoDiscountCents } from "@/lib/services/promo";
import {
  calculateOrderTotals,
  merchantChargeSettingsFromRow,
} from "@/lib/services/order-totals";
import { pointsDiscountCents } from "@/lib/loyalty/points";
import { getMemberSessionFromRequest } from "@/lib/customer/session";

const checkoutSchema = z.object({
  merchantSlug: z.string().min(1),
  tableId: z.string().min(1),
  customerId: z.string().uuid().optional(),
  promoCode: z.string().optional(),
  pointsToRedeem: z.number().int().min(0).optional(),
  serviceType: z.enum(["dine_in", "takeaway"]).default("dine_in"),
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
      selections: z
        .array(
          z.object({
            groupId: z.string().uuid(),
            optionId: z.string().uuid(),
            quantity: z.number().int().positive().optional(),
          }),
        )
        .optional(),
      packedForTakeaway: z.boolean().optional(),
    }),
  ),
});

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";
}

export async function POST(request: Request) {
  try {
    const body = checkoutSchema.parse(await request.json());
    const merchant = await getMerchantBySlug(body.merchantSlug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const table = await getVenueTable(merchant.id, body.tableId);
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const { subtotalCents, orderLines } = await resolveMenuItemsForCheckout(
      merchant.id,
      body.items,
      merchant.timezone ?? "Asia/Kuala_Lumpur",
      body.serviceType,
    );

    if (subtotalCents <= 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const session = getMemberSessionFromRequest(request);
    let customerId =
      body.customerId ??
      (session?.merchantSlug === body.merchantSlug ? session.customerId : null);

    let tierDiscountCents = 0;
    let pointsRedeemed = 0;
    let promoId: string | null = null;
    let promoDiscountCents = 0;

    if (customerId) {
      const customer = await getCustomerById(customerId);
      if (customer?.is_member && customer.merchant_id === merchant.id) {
        const levels = await getRewardLevels(merchant.id);
        const level = resolveCustomerLevel(customer.lifetime_points_earned, levels);
        const tierDiscount = applyLevelDiscount(subtotalCents, Number(level.discount_percent));
        tierDiscountCents = tierDiscount.discountCents;

        const requestedPoints = body.pointsToRedeem ?? 0;
        if (requestedPoints > 0) {
          const centsPerPoint = Number(merchant.points_redeem_cents_per_point ?? 10);
          const maxPoints = Math.min(
            customer.points_balance,
            Math.floor(subtotalCents / centsPerPoint),
          );
          pointsRedeemed = Math.min(requestedPoints, maxPoints);
        }
      } else {
        customerId = null;
      }
    }

    if (body.promoCode?.trim()) {
      const promo = await getPromoByCode(merchant.id, body.promoCode.trim());
      if (promo) {
        promoDiscountCents = calculatePromoDiscountCents(promo, subtotalCents);
        if (promoDiscountCents > 0) promoId = promo.id;
      }
    }

    const centsPerPoint = Number(merchant.points_redeem_cents_per_point ?? 10);
    const pointsDiscount = pointsDiscountCents(pointsRedeemed, centsPerPoint);
    const rawDiscountCents = tierDiscountCents + promoDiscountCents + pointsDiscount;

    const chargeSettings = merchantChargeSettingsFromRow(merchant);
    const totals = calculateOrderTotals(subtotalCents, rawDiscountCents, chargeSettings);

    const order = await createPendingOrder({
      merchantId: merchant.id,
      venueTableId: table.id,
      subtotalCents: totals.subtotalCents,
      serviceChargeCents: totals.serviceChargeCents,
      taxCents: totals.taxCents,
      taxLabel: totals.taxLabel,
      discountCents: totals.discountCents,
      customerId,
      promoId,
      pointsRedeemed,
      serviceType: body.serviceType,
    });

    await createOrderItems(order.id, orderLines);

    if (promoId) {
      await recordPromoRedemption({
        promoId,
        customerId,
        orderId: order.id,
      });
    }

    const thanksUrl = `${getAppUrl()}/m/${merchant.slug}/table/${body.tableId}/thanks?orderId=${order.id}`;

    if (isDevPaymentMode()) {
      return NextResponse.json({
        orderId: order.id,
        mode: "dev",
        subtotalCents: totals.subtotalCents,
        serviceChargeCents: totals.serviceChargeCents,
        taxCents: totals.taxCents,
        taxLabel: totals.taxLabel,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        devPayUrl: `/api/orders/${order.id}/dev-pay`,
        thanksUrl,
      });
    }

    const payment = await createHitPayPaymentRequest({
      orderId: order.id,
      amountCents: totals.totalCents,
      currency: merchant.currency,
      redirectUrl: thanksUrl,
      webhookUrl: `${getAppUrl()}/api/webhooks/payments`,
    });

    return NextResponse.json({
      orderId: order.id,
      mode: "hitpay",
      subtotalCents: totals.subtotalCents,
      serviceChargeCents: totals.serviceChargeCents,
      taxCents: totals.taxCents,
      taxLabel: totals.taxLabel,
      discountCents: totals.discountCents,
      totalCents: totals.totalCents,
      paymentUrl: payment.url,
      thanksUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
