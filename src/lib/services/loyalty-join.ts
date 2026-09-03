import {
  FIRST_JOIN_BONUS_POINTS,
} from "@/lib/loyalty/points";
import {
  awardPointsToCustomer,
  createMemberCustomer,
  getCustomerByPhone,
  getJoinToken,
  getOrderById,
  getRewardLevels,
  hasPointsLedgerEntry,
  linkOrderToCustomer,
  markJoinTokenUsed,
  updateCustomer,
} from "@/lib/db/repository";
import { runCampaignTrigger } from "@/lib/campaigns/workflow-runtime";
import type { CustomerRow } from "@/lib/db/types";
import {
  awardOrderPointsIfEligible,
  getCustomerTierForMerchant,
} from "@/lib/services/loyalty-points";
import { awardOrderStampsIfEligible } from "@/lib/services/loyalty-stamps";
import {
  updateCustomerVisitAndUsual,
} from "@/lib/services/automation";

export type JoinResult = {
  customer: CustomerRow;
  pointsAwarded: number;
  stampsAwarded: number;
  firstJoin: boolean;
  tierName: string;
};

async function firstJoinBonusPoints(merchantId: string): Promise<number> {
  const levels = await getRewardLevels(merchantId);
  const base = levels.find((l) => l.level_number === 1) ?? levels[0];
  const welcome = Number(base?.welcome_points ?? 0);
  return welcome > 0 ? Math.floor(welcome) : FIRST_JOIN_BONUS_POINTS;
}

export async function processWhatsAppJoin(input: {
  token: string;
  phone: string;
  externalUserId?: string | null;
}): Promise<JoinResult> {
  const joinRow = await getJoinToken(input.token);
  if (!joinRow) throw new JoinError("Invalid join link. Check your receipt.");
  if (joinRow.used_at) throw new JoinError("This join link was already used.");
  if (new Date(joinRow.expires_at) < new Date()) {
    throw new JoinError("This join link expired. Order again to get a new one.");
  }

  const order = await getOrderById(joinRow.order_id);
  if (!order || order.status !== "paid") {
    throw new JoinError("Payment not confirmed yet. Try again in a moment.");
  }

  // Claim the token first so concurrent JOIN messages cannot double-award.
  const claimed = await markJoinTokenUsed(input.token);
  if (!claimed) throw new JoinError("This join link was already used.");

  let customer = await getCustomerByPhone(order.merchant_id, input.phone);
  let pointsAwarded = 0;
  let stampsAwarded = 0;
  let firstJoin = false;

  if (!customer) {
    customer = await createMemberCustomer({
      merchantId: order.merchant_id,
      phone: input.phone,
      externalUserId: input.externalUserId,
    });
    firstJoin = true;
  } else if (!customer.is_member) {
    customer = await updateCustomer(customer.id, {
      is_member: true,
      external_user_id: input.externalUserId ?? customer.external_user_id,
    });
    firstJoin = true;
  } else if (input.externalUserId && !customer.external_user_id) {
    customer = await updateCustomer(customer.id, {
      external_user_id: input.externalUserId,
    });
  }

  if (!customer.first_join_bonus_awarded) {
    const bonus = await firstJoinBonusPoints(order.merchant_id);
    pointsAwarded += bonus;
    customer = await awardPointsToCustomer({
      customer,
      orderId: order.id,
      points: bonus,
      reason: "first_join_bonus",
    });
    customer = await updateCustomer(customer.id, { first_join_bonus_awarded: true });
    firstJoin = true;
  }

  await linkOrderToCustomer(order.id, customer.id);

  const hasOrderPoints = await hasPointsLedgerEntry(
    order.id,
    customer.id,
    "order_paid",
  );

  if (!hasOrderPoints) {
    const orderPoints = await awardOrderPointsIfEligible({
      customer,
      merchantId: order.merchant_id,
      orderId: order.id,
      totalCents: order.total_cents,
    });
    pointsAwarded += orderPoints;
    customer = (await getCustomerByPhone(order.merchant_id, input.phone)) ?? customer;
  }

  stampsAwarded = await awardOrderStampsIfEligible({
    customer,
    merchantId: order.merchant_id,
    orderId: order.id,
  });
  customer = (await getCustomerByPhone(order.merchant_id, input.phone)) ?? customer;

  await updateCustomerVisitAndUsual(order.id, customer.id);

  const tier = await getCustomerTierForMerchant(customer, order.merchant_id);

  await runCampaignTrigger("member_joined", {
    merchantId: order.merchant_id,
    customer,
    orderId: order.id,
    source: "receipt",
    firstJoin,
    tierName: tier.current.name,
  });

  if (firstJoin) {
    await runCampaignTrigger("first_visit", {
      merchantId: order.merchant_id,
      customer,
      orderId: order.id,
      orderTotalCents: order.total_cents,
      tierName: tier.current.name,
    });
  }

  return {
    customer,
    pointsAwarded,
    stampsAwarded,
    firstJoin,
    tierName: tier.current.name,
  };
}

export class JoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JoinError";
  }
}
