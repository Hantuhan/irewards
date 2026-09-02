import { AssistantAdminShell } from "@/components/admin/AssistantAdminShell";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function AssistantAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  return <AssistantAdminShell merchantSlug={merchantSlug} />;
}
