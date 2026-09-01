import { RewardsShell } from "@/components/storefront/RewardsShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
};

export default async function RewardsPage({ params }: PageProps) {
  const { merchantSlug, tableId } = await params;
  return <RewardsShell merchantSlug={merchantSlug} tableId={tableId} />;
}
