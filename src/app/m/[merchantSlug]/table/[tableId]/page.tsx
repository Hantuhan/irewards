import { StorefrontShell } from "@/components/storefront/StorefrontShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
};

export default async function TableStorefrontPage({ params }: PageProps) {
  const { merchantSlug, tableId } = await params;

  return (
    <StorefrontShell merchantSlug={merchantSlug} tableId={tableId} />
  );
}
