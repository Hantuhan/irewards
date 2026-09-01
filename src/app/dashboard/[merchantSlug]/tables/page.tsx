import { TablesAdminShell } from "@/components/admin/TablesAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function TablesAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <TablesAdminShell merchantSlug={merchantSlug} />;
}
