import { getMerchantBySlug } from "@/lib/db/repository";
import { verifyMerchantAdmin } from "@/lib/merchant/auth";
import { getSessionFromRequest } from "@/lib/merchant/session";

/**
 * Merchant dashboard/API gate. Rejects suspended tenants even with a valid session.
 */
export async function verifyMerchantAccess(
  request: Request,
  merchantSlug: string,
): Promise<boolean> {
  const session = getSessionFromRequest(request);
  if (session?.merchantSlug === merchantSlug) {
    try {
      const merchant = await getMerchantBySlug(merchantSlug);
      if (!merchant || merchant.suspended_at) return false;
      return true;
    } catch {
      return false;
    }
  }
  // Opt-in only. This used to switch itself on whenever MERCHANT_SESSION_SECRET
  // was unset, which is the default local setup — so every dashboard route ran
  // with authorization disabled, no smoke test ever exercised the access rules,
  // and anyone pointing a NODE_ENV=development process at real data could read
  // every tenant. It now needs the same explicit flag the admin bypass uses.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_MERCHANT_ACCESS === "true"
  ) {
    return true;
  }
  return verifyMerchantAdmin(request);
}
