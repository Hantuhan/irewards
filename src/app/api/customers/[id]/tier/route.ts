import { NextResponse } from "next/server";
import { getCustomerById } from "@/lib/db/repository";
import { getCustomerTierForMerchant } from "@/lib/services/loyalty-points";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customer = await getCustomerById(id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const tier = await getCustomerTierForMerchant(customer, customer.merchant_id);

    return NextResponse.json({
      customerId: customer.id,
      lifetimePointsEarned: tier.lifetimePointsEarned,
      pointsBalance: customer.points_balance,
      currentLevel: {
        levelNumber: tier.current.level_number,
        name: tier.current.name,
        perkDescription: tier.current.perk_description,
        pointsMultiplier: Number(tier.current.points_multiplier),
        discountPercent: Number(tier.current.discount_percent),
      },
      nextLevel: tier.next
        ? {
            levelNumber: tier.next.level_number,
            name: tier.next.name,
            minLifetimePoints: tier.next.min_lifetime_points,
          }
        : null,
      pointsToNextLevel: tier.pointsToNextLevel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
