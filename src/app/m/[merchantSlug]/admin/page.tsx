import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

/** Legacy path — merchant SaaS lives under /dashboard */
export default async function LegacyAdminRedirect({ params }: PageProps) {
  const { merchantSlug } = await params;
  redirect(`/dashboard/${merchantSlug}`);
}
