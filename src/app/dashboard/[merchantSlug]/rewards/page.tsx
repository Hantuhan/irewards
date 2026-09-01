import { RewardsAdminShell } from "@/components/admin/RewardsAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function RewardsAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <RewardsAdminShell merchantSlug={merchantSlug} />;
}
