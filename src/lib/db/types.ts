export type KitchenStatus = string;

export type MerchantRow = {
  id: string;
  slug: string;
  name: string;
  currency: "MYR" | "SGD";
  whatsapp_number: string | null;
  points_per_ringgit: number;
  birthday_bonus_points?: number;
  points_expiry_days?: number;
  points_redeem_cents_per_point?: number;
  timezone?: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_url: string | null;
  xhs_url: string | null;
  website_url: string | null;
  store_email: string | null;
  logo_url: string | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  languages?: string[];
  registration_number: string | null;
  sst_number: string | null;
  gst_number: string | null;
  landline_number: string | null;
  /** Master switch for triggered campaigns ("pause all automations"). */
  retention_enabled?: boolean;
  /** Local send window start (HH:MM:SS); null = anytime. */
  campaign_send_window_start?: string | null;
  campaign_send_window_end?: string | null;
  /** Min hours between auto sends to the same member (0 = off). */
  campaign_send_cap_hours?: number | null;
  automation_sweep_at?: string | null;
  service_charge_enabled?: boolean;
  service_charge_percent?: number;
  sst_enabled?: boolean;
  sst_rate_percent?: number;
  gst_enabled?: boolean;
  gst_rate_percent?: number;
  receipt_footer_text?: string | null;
  receipt_show_registration?: boolean;
  receipt_layout_json?: unknown;
  receipt_delivery_email?: boolean;
  receipt_delivery_whatsapp?: boolean;
  menu_badges_json?: unknown;
  menu_ingredient_presets_json?: unknown;
  halal_certified?: boolean | null;
  halal_certificate_url?: string | null;
  refund_policy?: string | null;
  privacy_policy?: string | null;
  daily_revenue_target_cents?: number | null;
  weekly_revenue_target_cents?: number | null;
  monthly_revenue_target_cents?: number | null;
  kitchen_flow_json?: unknown;
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
  service_charge_cents?: number;
  tax_cents?: number;
  tax_label?: string | null;
  discount_cents: number;
  total_cents: number;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
  kitchen_status: KitchenStatus | null;
  promo_id: string | null;
  points_redeemed: number;
  service_type?: "dine_in" | "takeaway";
  receipt_requested?: boolean;
  receipt_sent_at?: string | null;
  receipt_delivery_method?: "email" | "whatsapp" | null;
  receipt_destination?: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price_cents: number;
  modifiers?: { groupName: string; optionName: string; priceDeltaCents: number }[] | null;
  packed_for_takeaway?: boolean;
  takeaway_surcharge_cents?: number;
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
  email: string | null;
  receipt_delivery_preference: "email" | "whatsapp" | null;
};

export type RewardLevelRow = {
  id: string;
  merchant_id: string;
  level_number: number;
  name: string;
  min_lifetime_points: number;
  points_multiplier: number;
  perk_description: string | null;
  name_i18n?: Record<string, string> | null;
  perk_description_i18n?: Record<string, string> | null;
  discount_percent: number;
  tier_active?: boolean;
  point_expiry_days?: number | null;
  birthday_points?: number;
  welcome_points?: number;
  welcome_rewards?: number;
  renew_points?: number;
  renew_rewards?: number;
  validity_months?: number | null;
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
  label_i18n?: Record<string, string> | null;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  merchant_id: string;
  category_id: string;
  slug: string;
  name: string;
  name_i18n?: Record<string, string> | null;
  description: string | null;
  description_i18n?: Record<string, string> | null;
  price_cents: number;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  tags: string[];
  availability_mode: "always" | "weekly" | "date_range";
  availability_weekly: Record<string, { start: string; end: string }[]> | null;
  available_from: string | null;
  available_until: string | null;
  special_tags?: string[];
  kcal?: number | null;
  sugar_g?: number | null;
  ingredients?: string | null;
  ingredients_i18n?: Record<string, string> | null;
  item_notes?: string | null;
  item_notes_i18n?: Record<string, string> | null;
  ingredient_ids?: string[];
  coffee_profile_json?: Record<string, unknown> | null;
  takeaway_charge_enabled?: boolean;
  takeaway_surcharge_type?: "percentage" | "fixed" | null;
  takeaway_surcharge_value?: number | null;
  takeaway_surcharge_priority?: number;
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
  campaign_id?: string | null;
  created_at?: string;
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
  banner_image_url: string | null;
  link_url: string | null;
  workflow: unknown;
  trigger_type: string | null;
  /** Why the system paused it (e.g. Meta paused the template); null when the merchant chose the status. */
  status_reason?: string | null;
  created_at: string;
};

export type MerchantUserRow = {
  id: string;
  merchant_id: string;
  email: string;
  password_hash: string;
  name: string | null;
};

export type WhatsAppTemplateStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "paused"
  | "disabled"
  | "failed";

export type WhatsAppTemplateRow = {
  id: string;
  merchant_id: string;
  campaign_id: string | null;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  body_text: string;
  /** Placeholder tokens in {{n}} order, e.g. ["merchant", "name"]. */
  variables: string[];
  header_image_url: string | null;
  components: unknown[];
  meta_template_id: string | null;
  status: WhatsAppTemplateStatus;
  rejection_reason: string | null;
  /** Meta quality score: GREEN / YELLOW / RED / UNKNOWN. */
  quality_rating?: string | null;
  provider: "meta" | "dev";
  submitted_at: string | null;
  reviewed_at: string | null;
  status_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppNumberHealthRow = {
  phone_number_id: string;
  display_phone_number: string | null;
  /** GREEN / YELLOW / RED / UNKNOWN */
  quality_rating: string | null;
  /** e.g. TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED */
  messaging_limit: string | null;
  /** Last webhook event: ONBOARDING, UPGRADE, DOWNGRADE, FLAGGED, UNFLAGGED */
  last_event: string | null;
  updated_at: string;
};
