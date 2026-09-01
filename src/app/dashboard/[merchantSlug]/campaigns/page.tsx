import { CampaignsAdminShell } from "@/components/admin/CampaignsAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function CampaignsAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <CampaignsAdminShell merchantSlug={merchantSlug} />;
}
