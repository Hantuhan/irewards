import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export default async function LegacyAdminRewardsRedirect({ params }: PageProps) {
  const { merchantSlug } = await params;
  redirect(`/dashboard/${merchantSlug}/rewards`);
}
