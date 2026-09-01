import { AutomationAdminShell } from "@/components/admin/AutomationAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function AutomationAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <AutomationAdminShell merchantSlug={merchantSlug} />;
}
