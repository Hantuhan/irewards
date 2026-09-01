export function verifyMerchantAdmin(request: Request): boolean {
  const secret = process.env.MERCHANT_ADMIN_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  return request.headers.get("x-merchant-admin-secret") === secret;
}
