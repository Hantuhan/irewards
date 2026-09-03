import { adminDb } from "@/lib/db/admin";
import { DEFAULT_REWARD_LEVELS } from "@/lib/loyalty/default-reward-levels";
import { hashPassword } from "@/lib/merchant/password";
import {
  isReservedSubdomain,
  isValidSubdomainFormat,
  normalizeSubdomainInput,
} from "@/lib/tenancy/slug";
import type { MerchantRow } from "@/lib/db/types";

function db() {
  return adminDb();
}

export type ProvisionMerchantInput = {
  cafeName: string;
  currency: "MYR" | "SGD";
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  /** Optional explicit subdomain; otherwise derived from cafe name. */
  subdomain?: string;
};

export type ProvisionMerchantResult = {
  merchant: MerchantRow;
  subdomain: string;
  ownerEmail: string;
};

async function subdomainTaken(subdomain: string): Promise<boolean> {
  const { data: bySub } = await db()
    .from("merchants")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (bySub) return true;
  const { data: bySlug } = await db()
    .from("merchants")
    .select("id")
    .eq("slug", subdomain)
    .maybeSingle();
  return Boolean(bySlug);
}

async function subdomainAvailable(subdomain: string): Promise<boolean> {
  return (
    isValidSubdomainFormat(subdomain) &&
    !isReservedSubdomain(subdomain) &&
    !(await subdomainTaken(subdomain))
  );
}

async function allocateSubdomain(preferred: string): Promise<string> {
  const base = normalizeSubdomainInput(preferred, preferred);
  if (await subdomainAvailable(base)) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 44)}-${i}`;
    if (await subdomainAvailable(candidate)) return candidate;
  }
  throw new Error("Could not allocate a free subdomain — try another cafe name");
}

export async function provisionMerchant(
  input: ProvisionMerchantInput,
): Promise<ProvisionMerchantResult> {
  const preferred = normalizeSubdomainInput(
    input.subdomain ?? "",
    input.cafeName,
  );
  const subdomain = await allocateSubdomain(preferred);

  const { data: merchant, error: merchantError } = await db()
    .from("merchants")
    .insert([
      {
        slug: subdomain,
        subdomain,
        name: input.cafeName.trim(),
        currency: input.currency,
        retention_enabled: true,
        points_per_ringgit: 0.1,
        points_redeem_cents_per_point: 10,
      },
    ])
    .select("*")
    .single();

  if (merchantError || !merchant) {
    throw new Error(merchantError?.message ?? "Failed to create merchant");
  }

  const merchantId = (merchant as MerchantRow).id;

  const { error: userError } = await db().from("merchant_users").insert([
    {
      merchant_id: merchantId,
      email: input.ownerEmail.toLowerCase(),
      password_hash: hashPassword(input.ownerPassword),
      name: input.ownerName.trim(),
      role: "owner",
      active: true,
    },
  ]);
  if (userError) {
    await db().from("merchants").delete().eq("id", merchantId);
    throw new Error(
      userError.message.toLowerCase().includes("unique")
        ? "That email is already registered"
        : userError.message,
    );
  }

  const tables = ["1", "2", "3", "4", "5"].map((table_number) => ({
    merchant_id: merchantId,
    table_number,
  }));
  await db().from("venue_tables").insert(tables);

  const levels = DEFAULT_REWARD_LEVELS.map((lvl) => ({
    merchant_id: merchantId,
    level_number: lvl.levelNumber,
    name: lvl.name,
    min_lifetime_points: lvl.minLifetimePoints,
    points_multiplier: lvl.pointsMultiplier,
    perk_description: lvl.perkDescription,
    discount_percent: lvl.discountPercent,
  }));
  await db().from("reward_levels").insert(levels);

  return {
    merchant: merchant as MerchantRow,
    subdomain,
    ownerEmail: input.ownerEmail.toLowerCase(),
  };
}

export async function listAllTenants(): Promise<
  Array<{
    id: string;
    slug: string;
    subdomain: string;
    name: string;
    currency: string;
    retentionEnabled: boolean;
    suspended: boolean;
    createdAt: string | null;
    staffCount: number;
  }>
> {
  const { data: merchants, error } = await db()
    .from("merchants")
    .select("id, slug, subdomain, name, currency, retention_enabled, suspended_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (merchants ?? []) as Array<{
    id: string;
    slug: string;
    subdomain?: string | null;
    name: string;
    currency: string;
    retention_enabled?: boolean;
    suspended_at?: string | null;
    created_at?: string | null;
  }>;

  const results = [];
  for (const m of rows) {
    const { count } = await db()
      .from("merchant_users")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", m.id)
      .eq("active", true);
    results.push({
      id: m.id,
      slug: m.slug,
      subdomain: m.subdomain ?? m.slug,
      name: m.name,
      currency: m.currency,
      retentionEnabled: m.retention_enabled !== false,
      suspended: Boolean(m.suspended_at),
      createdAt: m.created_at ?? null,
      staffCount: count ?? 0,
    });
  }
  return results;
}

export async function setTenantRetention(merchantId: string, enabled: boolean): Promise<void> {
  const { error } = await db()
    .from("merchants")
    .update({ retention_enabled: enabled })
    .eq("id", merchantId);
  if (error) throw new Error(error.message);
}

export async function setTenantSuspended(merchantId: string, suspended: boolean): Promise<void> {
  const { error } = await db()
    .from("merchants")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", merchantId);
  if (error) throw new Error(error.message);
}
