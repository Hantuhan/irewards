import { NextResponse } from "next/server";
import { getMerchantBySlug, getRewardLevels } from "@/lib/db/repository";
import { listActiveMessagingCampaigns } from "@/lib/db/merchant-repository";
import { buildJoinOffer, pickWelcomeCampaign } from "@/lib/loyalty/join-offer";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Public storefront preview of the post-pay WhatsApp join offer.
 * Used for a non-blocking guest menu pin — does not enroll anyone.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const [campaigns, levels] = await Promise.all([
      listActiveMessagingCampaigns(merchant.id),
      getRewardLevels(merchant.id),
    ]);
    const baseLevel = levels.find((l) => l.level_number === 1) ?? levels[0];
    const offer = buildJoinOffer({
      campaign: pickWelcomeCampaign(campaigns),
      fallbackWelcomePoints: Number(baseLevel?.welcome_points ?? 0),
      merchantName: merchant.name,
    });

    return NextResponse.json({
      offer: {
        headline: offer.headline,
        subtitle: offer.subtitle,
        badge: offer.badge,
        ctaLabel: offer.ctaLabel,
        campaignId: offer.campaignId,
        campaignName: offer.campaignName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load join offer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
