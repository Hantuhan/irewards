export const LEGAL_POLICY_SLUGS = ["refund", "privacy"] as const;

export type LegalPolicySlug = (typeof LEGAL_POLICY_SLUGS)[number];

export const LEGAL_POLICIES: Record<
  LegalPolicySlug,
  { title: string; settingsKey: "refundPolicy" | "privacyPolicy"; merchantColumn: string }
> = {
  refund: {
    title: "Refund Policy",
    settingsKey: "refundPolicy",
    merchantColumn: "refund_policy",
  },
  privacy: {
    title: "Privacy Policy",
    settingsKey: "privacyPolicy",
    merchantColumn: "privacy_policy",
  },
};

export function isLegalPolicySlug(value: string): value is LegalPolicySlug {
  return (LEGAL_POLICY_SLUGS as readonly string[]).includes(value);
}

export function legalPolicyPath(merchantSlug: string, policy: LegalPolicySlug): string {
  return `/m/${merchantSlug}/legal/${policy}`;
}

export function legalPolicyContent(
  merchant: { refund_policy?: string | null; privacy_policy?: string | null },
  policy: LegalPolicySlug,
): string | null {
  const raw =
    policy === "refund" ? merchant.refund_policy : merchant.privacy_policy;
  if (!raw?.trim()) return null;
  return raw;
}
