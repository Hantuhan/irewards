import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { apexDomain } from "@/lib/tenancy/host";

export default function MerchantHomePage() {
  const apex = apexDomain();
  return (
    <main className="flex min-h-screen flex-col items-center bg-surface p-6">
      <div className="w-full max-w-lg">
        <header className="zenith-surface mb-8 flex items-center justify-between px-8 py-6">
          <span className="font-display text-headline-sm font-bold tracking-tight text-primary">
            iRewards
          </span>
          <span className="font-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
            For merchants
          </span>
        </header>

        <div className="zenith-surface flex flex-col gap-6 p-8">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            B2B SaaS · MY &amp; SG
          </p>
          <h1 className="font-display text-headline-lg text-primary">
            Table storefront + WhatsApp retention for your cafe
          </h1>
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Configure menus, iRewards tiers, campaigns, and table QR codes. Your
            customers only see the mobile storefront when they scan — not this
            console.
          </p>

          <ul className="flex flex-col gap-2 border border-surface-container-high bg-surface-container-low p-4 text-body-md text-on-surface-variant">
            <li className="flex items-center gap-2">
              <Icon name="check" className="text-primary" />
              Order board &amp; kitchen workflow
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" className="text-primary" />
              5-level loyalty program
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" className="text-primary" />
              WhatsApp automation &amp; campaigns
            </li>
          </ul>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-primary py-4 font-display text-headline-sm text-on-primary"
          >
            <Icon name="login" />
            Merchant sign in
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 border border-primary py-3 font-display text-headline-sm text-primary"
          >
            Create cafe portal
          </Link>
          <p className="text-center text-body-md text-on-surface-variant">
            Each cafe gets{" "}
            <span className="font-mono text-label-mono">cafe.{apex}</span>
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <p className="mt-6 text-center text-body-md text-on-surface-variant">
            Dev:{" "}
            <Link href="/demo" className="text-primary underline">
              live demo hub
            </Link>{" "}
            (customer + merchant previews)
          </p>
        )}
      </div>
    </main>
  );
}
