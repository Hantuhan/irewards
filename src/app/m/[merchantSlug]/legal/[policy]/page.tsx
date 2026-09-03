import { notFound } from "next/navigation";
import { StorefrontDocShell } from "@/components/storefront/LegalPolicyShell";
import { getMerchantBySlug } from "@/lib/db/repository";
import {
  isLegalPolicySlug,
  LEGAL_POLICIES,
  legalPolicyContent,
  type LegalPolicySlug,
} from "@/lib/merchant/legal-policies";

type PageProps = {
  params: Promise<{ merchantSlug: string; policy: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { merchantSlug, policy } = await params;
  if (!isLegalPolicySlug(policy)) return { title: "Policy" };

  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) return { title: "Policy" };

  const titles: Record<LegalPolicySlug, string> = {
    refund: "Refund Policy",
    privacy: "Privacy Policy",
  };

  return {
    title: `${titles[policy]} · ${merchant.name}`,
  };
}

export default async function LegalPolicyPage({ params }: PageProps) {
  const { merchantSlug, policy } = await params;
  if (!isLegalPolicySlug(policy)) notFound();

  const merchant = await getMerchantBySlug(merchantSlug);
  if (!merchant) notFound();

  const content = legalPolicyContent(merchant, policy);
  if (!content) notFound();

  return (
    <StorefrontDocShell
      merchantSlug={merchantSlug}
      merchantName={merchant.name}
      title={LEGAL_POLICIES[policy].title}
      content={content}
    />
  );
}
