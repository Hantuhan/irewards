export function buildReceiptQrUrl(input: {
  orderId: string;
  merchantSlug?: string | null;
  tableId?: string | null;
}): string {
  const { orderId, merchantSlug, tableId } = input;
  const table = tableId ?? "1";

  if (merchantSlug) {
    const path = `/m/${merchantSlug}/table/${table}/thanks?orderId=${orderId}`;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (envOrigin) return `${envOrigin}${path}`;
    return path;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/orders/${orderId}`;
  }
  return `/api/orders/${orderId}`;
}
