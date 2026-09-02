"use client";

import Link from "next/link";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { customerRoutes } from "@/lib/navigation/routes";

type ProfileShellProps = {
  merchantSlug: string;
  tableId: string;
};

export function ProfileShell({ merchantSlug, tableId }: ProfileShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { languages } = useStorefrontMenu(merchantSlug, lang);
  const { member, loading } = useMemberSession();
  const routes = customerRoutes(merchantSlug, tableId);

  const title = member?.displayName?.trim() || (member ? "iRewards member" : "Guest diner");
  const subtitle = loading
    ? "Loading…"
    : member
      ? `${member.points} points · lifetime ${member.tierPoints}`
      : "Guest · join iRewards after your first order";

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-mobile text-primary">{copy.profile}</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
          </div>
          {languages.length > 1 && (
            <StorefrontLanguagePicker languages={languages} value={lang} onChange={setLang} />
          )}
        </div>
      </header>

      <main className="flex flex-col gap-6 px-6 py-6 pb-24">
        <section className="zenith-surface p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border border-surface-container-highest bg-surface-container-low">
              <Icon name="person" className="text-3xl text-on-surface-variant" />
            </div>
            <div>
              <h2 className="font-display text-headline-sm text-primary">{title}</h2>
              <p className="text-body-md text-on-surface-variant">
                Table {tableId} · {merchantSlug}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Notifications
          </h2>
          <div className="flex flex-col border border-surface-container-highest p-4">
            <p className="font-display text-headline-sm text-primary">WhatsApp updates</p>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {member
                ? member.marketingOptOut
                  ? "Opted out — reply START is not available yet; ask staff to re-join after your next visit."
                  : "On — points, vouchers, and win-back offers. Reply STOP anytime to opt out."
                : "Join on WhatsApp after payment to get member messages."}
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Account
          </h2>
          <div className="flex flex-col border border-surface-container-highest">
            <Link
              href={routes.rewards}
              className="flex items-center justify-between border-b border-surface-container p-4 transition-colors hover:bg-surface-container-low"
            >
              <span className="font-display text-headline-sm text-primary">iRewards status</span>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </Link>
            <Link
              href={routes.shop}
              className="flex items-center justify-between p-4 transition-colors hover:bg-surface-container-low"
            >
              <span className="font-display text-headline-sm text-primary">Back to menu</span>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </Link>
          </div>
        </section>

        {!member && !loading && (
          <p className="text-center text-body-md text-on-surface-variant">
            Complete an order and tap{" "}
            <span className="font-semibold text-primary">Join iRewards on WhatsApp</span> on the
            thank-you screen. Or enter your mobile on the menu if you already joined.
          </p>
        )}
      </main>

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="profile"
        labels={{
          shop: copy.shop,
          rewards: copy.rewards,
          cart: copy.cart,
          profile: copy.profile,
        }}
      />
    </MobileShell>
  );
}
