export type StorefrontMenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  menuItemId: string;
  imageUrl?: string | null;
  tags?: string[];
};

export type StorefrontCategory = {
  id: string;
  label: string;
  items: StorefrontMenuItem[];
};

export async function fetchStorefrontMenu(
  merchantSlug: string,
): Promise<StorefrontCategory[]> {
  const response = await fetch(
    `/api/merchant/${merchantSlug}/menu?format=storefront`,
    { cache: "no-store" },
  );
  const json = (await response.json()) as {
    categories?: StorefrontCategory[];
    error?: string;
  };
  if (!response.ok) throw new Error(json.error ?? "Failed to load menu");
  return json.categories ?? [];
}
