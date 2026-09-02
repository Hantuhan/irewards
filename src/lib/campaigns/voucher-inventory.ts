export type VoucherStatus = "active" | "redeemed" | "expired" | "revoked";

export type VoucherInventoryItem = {
  id: string;
  promoId: string;
  code: string;
  customerName: string | null;
  valueLabel: string;
  status: VoucherStatus;
  expiresAt: string | null;
  issuedAt: string;
  issuedBy: string | null;
  redeemedAt: string | null;
  promoName: string;
};

export function formatVoucherCode(base: string | null, id: string): string {
  const basePart = (base ?? "VOUCHER").replace(/\s+/g, "-").toUpperCase();
  const suffix = id.replace(/-/g, "").slice(0, 3).toUpperCase();
  return `${basePart}-${suffix}`;
}

export function formatVoucherValue(
  type: "percentage" | "fixed",
  value: number,
  currency: "MYR" | "SGD" = "MYR",
): string {
  if (type === "percentage") return `${value}% Off`;
  const symbol = currency === "SGD" ? "S$" : "RM";
  return `${symbol}${value} Flat`;
}

export function resolveVoucherStatus(input: {
  active: boolean;
  expiresAt: string | null;
  redeemedAt: string | null;
}): VoucherStatus {
  if (input.redeemedAt) return "redeemed";
  if (!input.active) return "revoked";
  if (input.expiresAt && new Date(input.expiresAt) < new Date()) return "expired";
  return "active";
}

export function formatVoucherDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatVoucherDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function voucherStatusLabel(status: VoucherStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "redeemed":
      return "Redeemed";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
  }
}

export function voucherStatusDotClass(status: VoucherStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-600";
    case "redeemed":
      return "bg-outline-variant";
    case "expired":
      return "bg-red-500";
    case "revoked":
      return "bg-outline-variant";
  }
}
