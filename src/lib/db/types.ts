export type KitchenStatus = "new" | "preparing" | "ready" | "served";

export type MerchantRow = {
  id: string;
  slug: string;
  name: string;
  currency: "MYR" | "SGD";
  whatsapp_number: string | null;
  points_per_ringgit: number;
  timezone?: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_url: string | null;
  xhs_url: string | null;
  website_url: string | null;
  store_email: string | null;
  google_review_delay_minutes?: number;
  bounce_back_discount_percent?: number;
  bounce_back_expiry_days?: number;
};

export type VenueTableRow = {
  id: string;
  merchant_id: string;
  table_number: string;
};

export type OrderRow = {
  id: string;
  merchant_id: string;
  venue_table_id: string | null;
  customer_id: string | null;
  status: "pending" | "paid" | "cancelled";
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
  kitchen_status: KitchenStatus | null;
  promo_id: string | null;
  points_redeemed: number;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price_cents: number;
};

export type CustomerRow = {
  id: string;
  merchant_id: string;
  phone: string | null;
  external_user_id: string | null;
  is_member: boolean;
  points_balance: number;
  lifetime_points_earned: number;
  first_join_bonus_awarded: boolean;
  display_name: string | null;
  last_visit_at: string | null;
  marketing_opt_out: boolean;
  favorite_item_name: string | null;
  usual_order: { name: string; quantity: number }[] | null;
};

export type RewardLevelRow = {
  id: string;
  merchant_id: string;
  level_number: number;
  name: string;
  min_lifetime_points: number;
  points_multiplier: number;
  perk_description: string | null;
  discount_percent: number;
};

export type JoinTokenRow = {
  token: string;
  order_id: string;
  expires_at: string;
  used_at: string | null;
};

export type MenuCategoryRow = {
  id: string;
  merchant_id: string;
  slug: string;
  label: string;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  merchant_id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  tags: string[];
  availability_mode: "always" | "weekly" | "date_range";
  availability_weekly: Record<string, { start: string; end: string }[]> | null;
  available_from: string | null;
  available_until: string | null;
};

export type PromoRow = {
  id: string;
  merchant_id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  min_spend_cents: number | null;
  expires_at: string | null;
  active: boolean;
  code: string | null;
};

export type CampaignRow = {
  id: string;
  merchant_id: string;
  name: string;
  channel: "banner" | "whatsapp" | "sms" | "auto";
  status: "draft" | "active" | "scheduled" | "paused";
  reach_count: number;
  conversion_rate: number | null;
  message_body: string | null;
  banner_title: string | null;
  banner_text: string | null;
  link_url: string | null;
  created_at: string;
};

export type AutomationRuleRow = {
  id: string;
  merchant_id: string;
  rule_key: string;
  title: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

export type MerchantUserRow = {
  id: string;
  merchant_id: string;
  email: string;
  password_hash: string;
  name: string | null;
};
