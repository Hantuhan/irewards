import { adminDb } from "@/lib/db/admin";
import {
  promoPriceToRow,
  type UpsellLinkConfig,
  upsellLinkFromRow,
} from "@/lib/menu/upsell-rules";

function db() {
  return adminDb();
}

type GlobalUpsellRow = {
  menu_item_id: string;
  sort_order: number;
  suggest_type: string;
  promo_price_cents: number | null;
  rule_type: string;
  min_cart_cents: number | null;
  max_cart_cents: number | null;
  priority: number;
};

/** @deprecated Use listGlobalUpsellLinks */
export async function listGlobalUpsellSlugs(merchantId: string): Promise<string[]> {
  const links = await listGlobalUpsellLinks(merchantId);
  return links.map((l) => l.slug);
}

export async function listGlobalUpsellLinks(merchantId: string): Promise<UpsellLinkConfig[]> {
  const { data, error } = await db()
    .from("merchant_global_upsells")
    .select(
      "menu_item_id, sort_order, suggest_type, promo_price_cents, rule_type, min_cart_cents, max_cart_cents, priority",
    )
    .eq("merchant_id", merchantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const links = (data ?? []) as GlobalUpsellRow[];
  if (links.length === 0) return [];

  const itemIds = links.map((row) => row.menu_item_id);
  const { data: items, error: itemsError } = await db()
    .from("menu_items")
    .select("id, slug")
    .eq("merchant_id", merchantId)
    .in("id", itemIds);

  if (itemsError) throw new Error(itemsError.message);

  const slugById = new Map(
    ((items ?? []) as { id: string; slug: string }[]).map((item) => [item.id, item.slug]),
  );

  return links
    .map((row) => {
      const slug = slugById.get(row.menu_item_id);
      if (!slug) return null;
      return upsellLinkFromRow({
        slug,
        suggest_type: row.suggest_type,
        promo_price_cents: row.promo_price_cents,
        rule_type: row.rule_type,
        min_cart_cents: row.min_cart_cents,
        max_cart_cents: row.max_cart_cents,
        priority: row.priority,
      });
    })
    .filter((link): link is UpsellLinkConfig => link != null);
}

export async function replaceGlobalUpsells(
  merchantId: string,
  links: UpsellLinkConfig[],
): Promise<void> {
  const uniqueLinks = links.filter(
    (link, index, arr) => arr.findIndex((l) => l.slug === link.slug) === index,
  );

  const slugs = uniqueLinks.map((l) => l.slug);
  let targets: { id: string; slug: string }[] = [];
  if (slugs.length > 0) {
    const { data, error } = await db()
      .from("menu_items")
      .select("id, slug")
      .eq("merchant_id", merchantId)
      .in("slug", slugs);

    if (error) throw new Error(error.message);
    targets = (data ?? []) as { id: string; slug: string }[];

    if (targets.length !== slugs.length) {
      throw new Error("One or more checkout upsell products were not found");
    }
  }

  const { error: deleteError } = await db()
    .from("merchant_global_upsells")
    .delete()
    .eq("merchant_id", merchantId);

  if (deleteError) throw new Error(deleteError.message);

  if (targets.length === 0) return;

  const slugToId = new Map(targets.map((t) => [t.slug, t.id]));
  const { error: insertError } = await db().from("merchant_global_upsells").insert(
    uniqueLinks.map((link, index) => ({
      merchant_id: merchantId,
      menu_item_id: slugToId.get(link.slug)!,
      sort_order: index + 1,
      suggest_type: link.suggestType,
      promo_price_cents: promoPriceToRow(link),
      rule_type: link.ruleType,
      min_cart_cents: link.ruleType === "min_cart" ? (link.minCartCents ?? 0) : null,
      max_cart_cents: link.ruleType === "max_cart" ? (link.maxCartCents ?? 0) : null,
      priority: link.priority,
    })),
  );

  if (insertError) throw new Error(insertError.message);
}
