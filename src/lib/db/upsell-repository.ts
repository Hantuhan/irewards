import { createInsforgeAdmin } from "@/lib/insforge/client";
import {
  promoPriceToRow,
  type UpsellLinkConfig,
  upsellLinkFromRow,
} from "@/lib/menu/upsell-rules";

function db() {
  return createInsforgeAdmin().database;
}

type UpsellLinkRow = {
  menu_item_id: string;
  upsell_item_id: string;
  sort_order: number;
  suggest_type: string;
  promo_price_cents: number | null;
  rule_type: string;
  min_cart_cents: number | null;
  max_cart_cents: number | null;
  priority: number;
};

/** @deprecated Use listUpsellLinksByItemIds */
export async function listUpsellSlugsByItemIds(
  itemIds: string[],
): Promise<Map<string, string[]>> {
  const linkMap = await listUpsellLinksByItemIds(itemIds);
  const slugMap = new Map<string, string[]>();
  for (const [itemId, links] of linkMap) {
    slugMap.set(
      itemId,
      links.map((l) => l.slug),
    );
  }
  return slugMap;
}

export async function listUpsellLinksByItemIds(
  itemIds: string[],
): Promise<Map<string, UpsellLinkConfig[]>> {
  const map = new Map<string, UpsellLinkConfig[]>();
  if (itemIds.length === 0) return map;

  const { data, error } = await db()
    .from("menu_upsell_links")
    .select(
      "menu_item_id, upsell_item_id, sort_order, suggest_type, promo_price_cents, rule_type, min_cart_cents, max_cart_cents, priority",
    )
    .in("menu_item_id", itemIds)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const links = (data ?? []) as UpsellLinkRow[];
  if (links.length === 0) return map;

  const upsellIds = [...new Set(links.map((row) => row.upsell_item_id))];
  const { data: items, error: itemsError } = await db()
    .from("menu_items")
    .select("id, slug")
    .in("id", upsellIds);

  if (itemsError) throw new Error(itemsError.message);

  const slugById = new Map(
    ((items ?? []) as { id: string; slug: string }[]).map((item) => [item.id, item.slug]),
  );

  for (const row of links) {
    const slug = slugById.get(row.upsell_item_id);
    if (!slug) continue;
    const existing = map.get(row.menu_item_id) ?? [];
    existing.push(
      upsellLinkFromRow({
        slug,
        suggest_type: row.suggest_type,
        promo_price_cents: row.promo_price_cents,
        rule_type: row.rule_type,
        min_cart_cents: row.min_cart_cents,
        max_cart_cents: row.max_cart_cents,
        priority: row.priority,
      }),
    );
    map.set(row.menu_item_id, existing);
  }

  return map;
}

export async function replaceUpsellLinks(
  menuItemId: string,
  merchantId: string,
  links: UpsellLinkConfig[],
): Promise<void> {
  const uniqueLinks = links.filter(
    (link, index, arr) => arr.findIndex((l) => l.slug === link.slug) === index,
  );

  const { data: sourceRow, error: sourceError } = await db()
    .from("menu_items")
    .select("id, slug")
    .eq("id", menuItemId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (sourceError) throw new Error(sourceError.message);
  if (!sourceRow) throw new Error("Menu item not found");

  if (uniqueLinks.some((link) => link.slug === sourceRow.slug)) {
    throw new Error("A product cannot upsell itself");
  }

  const slugs = uniqueLinks.map((l) => l.slug);
  let upsellIds: { id: string; slug: string }[] = [];
  if (slugs.length > 0) {
    const { data: targets, error: targetsError } = await db()
      .from("menu_items")
      .select("id, slug")
      .eq("merchant_id", merchantId)
      .in("slug", slugs);

    if (targetsError) throw new Error(targetsError.message);
    upsellIds = (targets ?? []) as { id: string; slug: string }[];

    if (upsellIds.length !== slugs.length) {
      throw new Error("One or more upsell products were not found");
    }
  }

  const { error: deleteError } = await db()
    .from("menu_upsell_links")
    .delete()
    .eq("menu_item_id", menuItemId);

  if (deleteError) throw new Error(deleteError.message);

  if (upsellIds.length === 0) return;

  const slugToId = new Map(upsellIds.map((t) => [t.slug, t.id]));
  const { error: insertError } = await db().from("menu_upsell_links").insert(
    uniqueLinks.map((link, index) => ({
      menu_item_id: menuItemId,
      upsell_item_id: slugToId.get(link.slug)!,
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
