"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  customerRoutes,
  type CustomerTab,
} from "@/lib/navigation/routes";

type CustomerMobileNavProps = {
  merchantSlug: string;
  tableId: string;
  active: CustomerTab;
  cartCount?: number;
  labels?: Partial<Record<CustomerTab, string>>;
};

const defaultTabs: { id: CustomerTab; label: string; icon: string }[] = [
  { id: "shop", label: "Shop", icon: "storefront" },
  { id: "rewards", label: "Rewards", icon: "confirmation_number" },
  { id: "cart", label: "Cart", icon: "shopping_bag" },
  { id: "profile", label: "Profile", icon: "person" },
];

export function CustomerMobileNav({
  merchantSlug,
  tableId,
  active,
  cartCount = 0,
  labels,
}: CustomerMobileNavProps) {
  const routes = customerRoutes(merchantSlug, tableId);
  const tabs = defaultTabs.map((tab) => ({
    ...tab,
    label: labels?.[tab.id] ?? tab.label,
  }));

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex h-[64px] w-full max-w-mobile -translate-x-1/2 items-center justify-around border-t border-surface-container-highest bg-surface-container-lowest px-1 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const href = routes[tab.id];
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive ? "text-on-surface" : "text-on-surface-variant/70 hover:text-on-surface"
            }`}
          >
            <Icon name={tab.icon} className="text-[22px]" filled={isActive} />
            <span
              className={`font-mono text-[10px] tracking-[0.04em] ${
                isActive ? "font-semibold" : "font-medium"
              }`}
            >
              {tab.label}
            </span>
            {tab.id === "cart" && cartCount > 0 && (
              <span className="absolute right-[calc(50%-14px)] top-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
