import { notFound } from "next/navigation";
import { StorefrontDocShell } from "@/components/storefront/LegalPolicyShell";
import { getMerchantBySlug } from "@/lib/db/repository";
import { buildHelpCenterContent } from "@/lib/storefront/help-center";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { merchantSlug } = await params;
  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) return { title: "Help Center" };
  return { title: `Help Center · ${merchant.name}` };
}

export default async function HelpCenterPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) notFound();

  return (
    <StorefrontDocShell
      merchantSlug={merchantSlug}
      merchantName={merchant.name}
      title="Help Center"
      content={buildHelpCenterContent(merchant.name)}
    />
  );
}
