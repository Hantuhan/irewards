import { NextResponse } from "next/server";
import { getMerchantBySlug } from "@/lib/db/repository";
import { getPromoByCode } from "@/lib/db/merchant-repository";
import { getMemberSessionFromRequest } from "@/lib/customer/session";
import {
  checkRateLimit,
  rateLimitedResponse,
  requestIdentifier,
} from "@/lib/security/rate-limit";
import { evaluatePromoForCheckout } from "@/lib/services/promo";

type RouteContext = { params: Promise<{ slug: string }> };

/** Codes are short and guessable, so guessing has to cost something. */
const MAX_ATTEMPTS_PER_MINUTE = 12;

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const code = new URL(request.url).searchParams.get("code");
    const subtotal = Number(new URL(request.url).searchParams.get("subtotalCents") ?? 0);

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const limit = await checkRateLimit({
      bucket: `promo-validate:${slug}`,
      identifier: requestIdentifier(request),
      limit: MAX_ATTEMPTS_PER_MINUTE,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return rateLimitedResponse(
        limit.retryAfterSeconds,
        "Too many promo codes tried. Wait a moment and try again.",
      );
    }

    const merchant = await getMerchantBySlug(slug);
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const promo = await getPromoByCode(merchant.id, code);
    if (!promo) {
      return NextResponse.json({ valid: false, error: "Invalid promo code" });
    }

    // Same rules the checkout will apply, so the cart never promises a
    // discount that checkout then refuses.
    const session = getMemberSessionFromRequest(request);
    const customerId = session?.merchantSlug === slug ? session.customerId : null;
    const evaluation = await evaluatePromoForCheckout({
      promo,
      subtotalCents: subtotal,
      customerId,
    });

    if (!evaluation.ok) {
      return NextResponse.json({ valid: false, error: evaluation.reason });
    }

    return NextResponse.json({
      valid: true,
      promoId: promo.id,
      name: promo.name,
      discountCents: evaluation.discountCents,
    });
  } catch (error) {
    console.error("Promo validation failed:", error);
    return NextResponse.json({ error: "Could not check that code." }, { status: 500 });
  }
}
