import { CustomersAdminShell } from "@/components/admin/CustomersAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function CustomersAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <CustomersAdminShell merchantSlug={merchantSlug} />;
}
