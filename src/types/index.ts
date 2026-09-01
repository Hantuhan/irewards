export type Merchant = {
  id: string;
  slug: string;
  name: string;
  currency: "MYR" | "SGD";
  whatsappNumber: string | null;
};

export type Customer = {
  id: string;
  merchantId: string;
  phone: string | null;
  externalUserId: string | null;
  isMember: boolean;
  pointsBalance: number;
};

export type OrderStatus = "pending" | "paid" | "cancelled";

export type Order = {
  id: string;
  merchantId: string;
  tableId: string;
  customerId: string | null;
  status: OrderStatus;
  totalCents: number;
  paymentRef: string | null;
  paidAt: string | null;
};

export type JoinToken = {
  token: string;
  orderId: string;
  expiresAt: string;
  usedAt: string | null;
};

export type PointsLedgerEntry = {
  id: string;
  customerId: string;
  orderId: string | null;
  delta: number;
  reason: string;
};

export type PromoType = "percentage" | "fixed";

export type Promo = {
  id: string;
  merchantId: string;
  name: string;
  type: PromoType;
  value: number;
  minSpendCents: number | null;
  expiresAt: string | null;
  active: boolean;
};
