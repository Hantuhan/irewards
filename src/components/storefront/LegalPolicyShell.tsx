import type { LegalPolicySlug } from "@/lib/merchant/legal-policies";
import { LEGAL_POLICIES } from "@/lib/merchant/legal-policies";

type LegalPolicyShellProps = {
  merchantName: string;
  policy: LegalPolicySlug;
  content: string;
};

export function LegalPolicyShell({ merchantName, policy, content }: LegalPolicyShellProps) {
  const title = LEGAL_POLICIES[policy].title;

  return (
    <div className="min-h-screen bg-surface">
      <header className="zenith-surface border-b border-surface-container-highest">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-container-padding">
          <span className="font-display text-headline-sm font-bold tracking-tight text-primary">
            {merchantName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-container-padding py-10">
        <h1 className="font-display text-headline-mobile text-primary">{title}</h1>
        <div className="mt-6 whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">
          {content}
        </div>
      </main>
    </div>
  );
}
