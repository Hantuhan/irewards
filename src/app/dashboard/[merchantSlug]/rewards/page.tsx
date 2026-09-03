import { IRewardsHubShell } from "@/components/admin/IRewardsHubShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
  searchParams: Promise<{ setup?: string }>;
};

export default async function RewardsPage({ params, searchParams }: PageProps) {
  const { merchantSlug } = await params;
  const query = await searchParams;
  return (
    <IRewardsHubShell merchantSlug={merchantSlug} forceSetup={query.setup === "1"} />
  );
}
