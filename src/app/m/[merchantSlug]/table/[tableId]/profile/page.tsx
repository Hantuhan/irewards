import { ProfileShell } from "@/components/storefront/ProfileShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { merchantSlug, tableId } = await params;
  return <ProfileShell merchantSlug={merchantSlug} tableId={tableId} />;
}
