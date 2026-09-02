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
  { id: "shop", label: "Shop", icon: "home" },
  { id: "rewards", label: "Reward", icon: "confirmation_number" },
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
    <nav className="fixed bottom-0 left-1/2 z-50 flex h-16 w-full max-w-mobile -translate-x-1/2 items-center justify-around border-t border-surface-container-highest bg-surface px-4 py-2">
      {tabs.map((tab) => {
        const href = routes[tab.id];
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={`relative flex h-full w-full flex-col items-center justify-center transition-colors ${
              isActive
                ? "font-bold text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon
              name={tab.icon}
              className="mb-1 text-xl"
              filled={isActive && tab.id === "rewards"}
            />
            <span className="font-mono text-label-mono">{tab.label}</span>
            {tab.id === "cart" && cartCount > 0 && (
              <span className="absolute right-5 top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
