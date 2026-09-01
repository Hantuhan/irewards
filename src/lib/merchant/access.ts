import { verifyMerchantAdmin } from "@/lib/merchant/auth";
import { getSessionFromRequest } from "@/lib/merchant/session";

export function verifyMerchantAccess(request: Request, merchantSlug: string): boolean {
  const session = getSessionFromRequest(request);
  if (session?.merchantSlug === merchantSlug) return true;
  if (process.env.NODE_ENV === "development" && !process.env.MERCHANT_SESSION_SECRET) {
    return true;
  }
  return verifyMerchantAdmin(request);
}
