import { AnalyticsAdminShell } from "@/components/admin/AnalyticsAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function AnalyticsAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <AnalyticsAdminShell merchantSlug={merchantSlug} />;
}
