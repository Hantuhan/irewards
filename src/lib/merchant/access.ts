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
  if (process.env.NODE_ENV === "development" && !process.env.MERCHANT_SESSION_SECRET) {
    return true;
  }
  return verifyMerchantAdmin(request);
}
