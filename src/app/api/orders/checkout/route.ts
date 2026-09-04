import { z } from "zod";
import { NextResponse } from "next/server";
import {
  createPendingOrder,
  getCustomerById,
  getMerchantBySlug,
  getRewardLevels,
  getVenueTable,
  sumPendingPointsRedeemed,
} from "@/lib/db/repository";
import {
  createOrderItems,
  getPromoByCode,
  resolveMenuItemsForCheckout,
} from "@/lib/db/merchant-repository";
import { isDevPaymentMode } from "@/lib/payments/mode";
import { resolvePaymentProvider } from "@/lib/payments/provider";
import type { StorefrontPaymentMethod } from "@/lib/payments/types";
import { applyLevelDiscount, resolveCustomerLevel } from "@/lib/loyalty/tiers";
import { CheckoutError } from "@/lib/services/checkout-error";
import { evaluatePromoForCheckout } from "@/lib/services/promo";
import {
  calculateOrderTotals,
  merchantChargeSettingsFromRow,
} from "@/lib/services/order-totals";
import { pointsDiscountCents } from "@/lib/loyalty/points";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import { getRedeemAuthFromRequest } from "@/lib/customer/redeem-session";
import { previewPendingStampRewardDiscount } from "@/lib/services/loyalty-stamps";

const checkoutSchema = z.object({
  merchantSlug: z.string().min(1),
  tableId: z.string().min(1),
  // customerId from the client is ignored — only a signed member session counts.
  promoCode: z.string().optional(),
  pointsToRedeem: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["duitnow", "card", "wallet"]).optional(),
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
      note: z.string().max(160).optional(),
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
      session?.merchantSlug === body.merchantSlug ? session.customerId : null;

    let tierDiscountCents = 0;
    let customerEmail: string | null = null;
    let pointsRedeemed = 0;
    let promoId: string | null = null;
    let promoDiscountCents = 0;
    let stampRewardDiscountCents = 0;

    if (customerId) {
      const customer = await getCustomerById(customerId);
      if (customer?.is_member && customer.merchant_id === merchant.id) {
        customerEmail = customer.email;
        const levels = await getRewardLevels(merchant.id);
        const level = resolveCustomerLevel(customer.lifetime_points_earned, levels);
        const tierDiscount = applyLevelDiscount(subtotalCents, Number(level.discount_percent));
        tierDiscountCents = tierDiscount.discountCents;

        const requestedPoints = body.pointsToRedeem ?? 0;
        if (requestedPoints > 0 && merchant.points_program_enabled !== false) {
          const redeemAuth = getRedeemAuthFromRequest(request);
          if (
            !redeemAuth ||
            redeemAuth.customerId !== customer.id ||
            redeemAuth.merchantSlug !== body.merchantSlug
          ) {
            return NextResponse.json(
              {
                error:
                  "Verify with WhatsApp before spending points. Tap Redeem and enter the code we send you.",
              },
              { status: 403 },
            );
          }

          const reserved = await sumPendingPointsRedeemed(customer.id);
          const available = Math.max(0, customer.points_balance - reserved);
          const centsPerPoint = Number(merchant.points_redeem_cents_per_point ?? 10);
          const maxPoints = Math.min(
            available,
            Math.floor(subtotalCents / centsPerPoint),
          );
          if (requestedPoints > maxPoints) {
            return NextResponse.json(
              {
                error:
                  available < requestedPoints
                    ? `Only ${available} points available (some may be reserved on another unpaid order).`
                    : "Not enough points for this cart total.",
              },
              { status: 400 },
            );
          }
          pointsRedeemed = requestedPoints;
        }

        // Quoted now, spent only once the order is paid.
        const stampReward = await previewPendingStampRewardDiscount({
          customer,
          merchantId: merchant.id,
          subtotalCents,
        });
        stampRewardDiscountCents = stampReward.discountCents;
      } else {
        customerId = null;
      }
    }

    if (body.promoCode?.trim()) {
      const promo = await getPromoByCode(merchant.id, body.promoCode.trim());
      if (!promo) {
        return NextResponse.json({ error: "That promo code was not recognised." }, { status: 400 });
      }
      // A code that silently stops applying between the cart and here means the
      // diner pays full price after being shown a discount. Say so instead.
      const evaluation = await evaluatePromoForCheckout({
        promo,
        subtotalCents,
        customerId,
      });
      if (!evaluation.ok) {
        return NextResponse.json({ error: evaluation.reason }, { status: 400 });
      }
      promoDiscountCents = evaluation.discountCents;
      promoId = promo.id;
    }

    const centsPerPoint = Number(merchant.points_redeem_cents_per_point ?? 10);
    const pointsDiscount = pointsDiscountCents(pointsRedeemed, centsPerPoint);
    const rawDiscountCents =
      tierDiscountCents + promoDiscountCents + pointsDiscount + stampRewardDiscountCents;

    const chargeSettings = merchantChargeSettingsFromRow(merchant);
    const totals = calculateOrderTotals(subtotalCents, rawDiscountCents, chargeSettings);

    // Resolved before the order row is written so the gateway is recorded on
    // it from the start — a refund has to find its way back to whoever took
    // the money, even if the merchant switches provider next week.
    const provider = isDevPaymentMode() ? null : resolvePaymentProvider(merchant.currency);

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
      stampRewardApplied: stampRewardDiscountCents > 0,
      paymentProvider: provider?.name ?? "dev",
    });

    await createOrderItems(order.id, orderLines);

    // The promo redemption and the stamp reward are banked by
    // `completePaidOrder`, not here — an abandoned payment must not spend them.

    const thanksUrl = `${getAppUrl()}/m/${merchant.slug}/table/${body.tableId}/thanks?orderId=${order.id}`;

    // No provider means dev mode — there is nothing to charge through, so the
    // storefront is handed the simulate-payment endpoint instead of a gateway.
    if (!provider) {
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

    const preferredMethod = (body.paymentMethod ?? "duitnow") as StorefrontPaymentMethod;
    const payment = await provider.createPaymentRequest({
      orderId: order.id,
      amountCents: totals.totalCents,
      currency: merchant.currency,
      redirectUrl: thanksUrl,
      webhookUrl: `${getAppUrl()}/api/webhooks/payments`,
      method: preferredMethod,
      customerEmail,
    });

    return NextResponse.json({
      orderId: order.id,
      mode: provider.name,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "That order could not be read. Try again." }, { status: 400 });
    }
    // Messages from the menu resolver are written for diners ("Nasi lemak is
    // not available right now"); anything else is ours to debug, not theirs.
    const message = error instanceof CheckoutError ? error.message : "Checkout failed. Try again.";
    console.error("Checkout failed:", error);
    return NextResponse.json({ error: message }, { status: error instanceof CheckoutError ? 400 : 500 });
  }
}
