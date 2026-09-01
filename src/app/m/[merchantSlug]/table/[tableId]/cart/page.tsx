import { CartShell } from "@/components/storefront/CartShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
};

export default async function CartPage({ params }: PageProps) {
  const { merchantSlug, tableId } = await params;
  return <CartShell merchantSlug={merchantSlug} tableId={tableId} />;
}
