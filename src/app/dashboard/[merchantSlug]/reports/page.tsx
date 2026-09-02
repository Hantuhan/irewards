import { ReportsAdminShell } from "@/components/admin/ReportsAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function ReportsAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <ReportsAdminShell merchantSlug={merchantSlug} />;
}
