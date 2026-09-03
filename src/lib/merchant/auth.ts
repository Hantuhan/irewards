import { timingSafeEqualString } from "@/lib/merchant/password";

export function verifyMerchantAdmin(request: Request): boolean {
  const secret = process.env.MERCHANT_ADMIN_SECRET;
  if (!secret) {
    // Never open by default in production. Dev bypass requires explicit flag.
    return (
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_INSECURE_MERCHANT_ADMIN === "true"
    );
  }
  const provided = request.headers.get("x-merchant-admin-secret") ?? "";
  return timingSafeEqualString(provided, secret);
}
