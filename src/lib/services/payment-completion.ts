import { createJoinTokenValue } from "@/lib/loyalty/join-token";
import {
  createJoinToken,
  deductPointsFromCustomer,
  getCustomerById,
  getMerchantById,
  markOrderPaid,
} from "@/lib/db/repository";
import { awardOrderPointsIfEligible } from "@/lib/services/loyalty-points";
import {
  schedulePostPaymentJobs,
  updateCustomerVisitAndUsual,
} from "@/lib/services/automation";

export type PaymentCompletionResult = {
  orderId: string;
  joinToken: string;
  pointsAwarded: number;
};

/** Called only after payment is verified (webhook or dev-pay). */
export async function completePaidOrder(
  orderId: string,
  paymentRef: string,
): Promise<PaymentCompletionResult> {
  const order = await markOrderPaid(orderId, paymentRef);
  const joinToken = createJoinTokenValue();
  await createJoinToken(order.id, joinToken);

  let pointsAwarded = 0;

  if (order.customer_id) {
    let customer = await getCustomerById(order.customer_id);
    if (customer && order.points_redeemed > 0) {
      customer = await deductPointsFromCustomer({
        customer,
        orderId: order.id,
        points: order.points_redeemed,
        reason: "points_redeemed",
      });
    }

    if (customer?.is_member) {
      pointsAwarded = await awardOrderPointsIfEligible({
        customer,
        merchantId: order.merchant_id,
        orderId: order.id,
        totalCents: order.total_cents,
      });
      await updateCustomerVisitAndUsual(order.id, customer.id);
    }
  }

  const merchant = await getMerchantById(order.merchant_id);
  if (merchant) {
    await schedulePostPaymentJobs(order, merchant);
  }

  return { orderId: order.id, joinToken, pointsAwarded };
}
