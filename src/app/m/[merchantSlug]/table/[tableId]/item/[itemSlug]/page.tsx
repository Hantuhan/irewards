import { ProductDetailShell } from "@/components/storefront/ProductDetailShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string; itemSlug: string }>;
};

/** Storefront product detail page — one template for every product. */
export default async function StorefrontProductPage({ params }: PageProps) {
  const { merchantSlug, tableId, itemSlug } = await params;
  return (
    <ProductDetailShell
      merchantSlug={merchantSlug}
      tableId={tableId}
      itemSlug={decodeURIComponent(itemSlug)}
    />
  );
}
