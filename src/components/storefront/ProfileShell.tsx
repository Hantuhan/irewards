"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { customerRoutes } from "@/lib/navigation/routes";

type ProfileShellProps = {
  merchantSlug: string;
  tableId: string;
};

export function ProfileShell({ merchantSlug, tableId }: ProfileShellProps) {
  const [memberName, setMemberName] = useState<string | null>(null);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [promoEmails, setPromoEmails] = useState(false);
  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    const customerId = localStorage.getItem(`irewards-member:${merchantSlug}`);
    if (customerId) setMemberName(`Member · ${customerId.slice(0, 8)}`);
  }, [merchantSlug]);

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <h1 className="font-display text-headline-mobile text-primary">Profile</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {memberName ?? "Guest · join iRewards after your first order"}
        </p>
      </header>

      <main className="flex flex-col gap-6 px-6 py-6 pb-24">
        <section className="zenith-surface p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border border-surface-container-highest bg-surface-container-low">
              <Icon name="person" className="text-3xl text-on-surface-variant" />
            </div>
            <div>
              <h2 className="font-display text-headline-sm text-primary">
                {memberName ?? "Guest diner"}
              </h2>
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
          <div className="flex flex-col border border-surface-container-highest">
            <label className="flex items-center justify-between border-b border-surface-container p-4">
              <div>
                <p className="font-display text-headline-sm text-primary">
                  WhatsApp updates
                </p>
                <p className="text-body-md text-on-surface-variant">
                  Points, vouchers, and win-back offers
                </p>
              </div>
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between p-4">
              <div>
                <p className="font-display text-headline-sm text-primary">
                  Email promos
                </p>
                <p className="text-body-md text-on-surface-variant">
                  Seasonal menus and events
                </p>
              </div>
              <input
                type="checkbox"
                checked={promoEmails}
                onChange={(e) => setPromoEmails(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
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
              <span className="font-display text-headline-sm text-primary">
                iRewards status
              </span>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </Link>
            <button
              type="button"
              className="flex items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low"
            >
              <span className="font-display text-headline-sm text-primary">
                Order history
              </span>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </button>
          </div>
        </section>

        {!memberName && (
          <p className="text-center text-body-md text-on-surface-variant">
            Complete an order and tap{" "}
            <span className="font-semibold text-primary">Join iRewards on WhatsApp</span>{" "}
            on the thank-you screen.
          </p>
        )}
      </main>

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="profile"
      />
    </MobileShell>
  );
}
