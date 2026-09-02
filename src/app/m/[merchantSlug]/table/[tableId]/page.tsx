import { StorefrontShell } from "@/components/storefront/StorefrontShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
  searchParams: Promise<{ embed?: string; preview?: string }>;
};

export default async function TableStorefrontPage({ params, searchParams }: PageProps) {
  const { merchantSlug, tableId } = await params;
  const { embed, preview } = await searchParams;

  return (
    <StorefrontShell
      merchantSlug={merchantSlug}
      tableId={tableId}
      embed={embed === "1"}
      previewMember={preview === "member"}
    />
  );
}
