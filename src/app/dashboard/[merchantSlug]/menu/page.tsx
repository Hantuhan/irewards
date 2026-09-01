import { MenuAdminShell } from "@/components/admin/MenuAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function MenuAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <MenuAdminShell merchantSlug={merchantSlug} />;
}
