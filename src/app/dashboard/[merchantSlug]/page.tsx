import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function AdminDashboardPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <AdminDashboardShell merchantSlug={merchantSlug} />;
}
