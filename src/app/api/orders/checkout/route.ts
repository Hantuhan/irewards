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
import { pointsDiscountCents } from "@/lib/loyalty/points";
import { getMemberSessionFromRequest } from "@/lib/customer/session";

const checkoutSchema = z.object({
  merchantSlug: z.string().min(1),
  tableId: z.string().min(1),
  customerId: z.string().uuid().optional(),
  promoCode: z.string().optional(),
  pointsToRedeem: z.number().int().min(0).optional(),
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
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
          const maxPoints = Math.min(
            customer.points_balance,
            Math.floor(subtotalCents / 10),
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

    const pointsDiscount = pointsDiscountCents(pointsRedeemed);
    const discountCents = Math.min(
      subtotalCents,
      tierDiscountCents + promoDiscountCents + pointsDiscount,
    );
    const totalCents = Math.max(0, subtotalCents - discountCents);

    const order = await createPendingOrder({
      merchantId: merchant.id,
      venueTableId: table.id,
      subtotalCents,
      discountCents,
      customerId,
      promoId,
      pointsRedeemed,
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
        subtotalCents,
        discountCents,
        totalCents,
        devPayUrl: `/api/orders/${order.id}/dev-pay`,
        thanksUrl,
      });
    }

    const payment = await createHitPayPaymentRequest({
      orderId: order.id,
      amountCents: totalCents,
      currency: merchant.currency,
      redirectUrl: thanksUrl,
      webhookUrl: `${getAppUrl()}/api/webhooks/payments`,
    });

    return NextResponse.json({
      orderId: order.id,
      mode: "hitpay",
      subtotalCents,
      discountCents,
      totalCents,
      paymentUrl: payment.url,
      thanksUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
