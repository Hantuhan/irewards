import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { customerRoutes, dashboardRoutes } from "@/lib/navigation/routes";

const DEMO_SLUG = "demo-cafe";
const DEMO_TABLE = "1";

export default function DemoHubPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <p className="text-body-md text-on-surface-variant">Not available.</p>
      </main>
    );
  }

  const customer = customerRoutes(DEMO_SLUG, DEMO_TABLE);
  const dashboard = dashboardRoutes(DEMO_SLUG);

  return (
    <main className="flex min-h-screen flex-col items-center bg-surface p-6">
      <div className="w-full max-w-2xl">
        <header className="zenith-surface mb-6 px-8 py-6">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Development only
          </p>
          <h1 className="mt-1 font-display text-headline-md text-primary">
            Live demo hub
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            iRewards has two separate surfaces: merchant SaaS and diner storefront.
            Do not ship this page to production.
          </p>
        </header>

        <section className="zenith-surface mb-6 p-8">
          <h2 className="mb-1 font-display text-headline-sm text-primary">
            Merchant SaaS
          </h2>
          <p className="mb-4 text-body-md text-on-surface-variant">
            Cafe owners &amp; staff — dashboard at{" "}
            <code className="font-mono text-label-mono">/dashboard/{"{slug}"}</code>
          </p>
          <Link
            href={dashboard.home}
            className="inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-headline-sm text-primary"
          >
            <Icon name="dashboard" />
            Merchant dashboard
          </Link>
        </section>

        <section className="zenith-surface p-8">
          <h2 className="mb-1 font-display text-headline-sm text-primary">
            Diner storefront
          </h2>
          <p className="mb-4 text-body-md text-on-surface-variant">
            Customers reach this only via table QR —{" "}
            <code className="font-mono text-label-mono">
              /m/{"{slug}"}/table/{"{id}"}
            </code>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { href: customer.shop, label: "Shop", icon: "storefront" },
                { href: customer.rewards, label: "iRewards", icon: "confirmation_number" },
                { href: customer.cart, label: "Cart", icon: "shopping_bag" },
                { href: customer.profile, label: "Profile", icon: "person" },
              ] as const
            ).map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="flex items-center gap-3 border border-surface-container-highest px-4 py-3 hover:border-primary"
              >
                <Icon name={page.icon} />
                <span className="font-display text-headline-sm">{page.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <Link
          href="/"
          className="mt-8 block text-center font-mono text-label-mono text-on-surface-variant underline"
        >
          Back to merchant home
        </Link>
      </div>
    </main>
  );
}
