import { SettingsAdminShell } from "@/components/admin/SettingsAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function SettingsAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <SettingsAdminShell merchantSlug={merchantSlug} />;
}
