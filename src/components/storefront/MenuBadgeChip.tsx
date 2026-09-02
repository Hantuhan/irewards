"use client";

import { Icon } from "@/components/ui/Icon";
import type { MenuBadge } from "@/lib/menu/menu-badges";
import { badgeIcon, badgeLabel } from "@/lib/menu/menu-badges";

type MenuBadgeChipProps = {
  badgeId: string;
  catalog: MenuBadge[];
  variant?: "primary" | "muted";
};

export function MenuBadgeChip({ badgeId, catalog, variant = "primary" }: MenuBadgeChipProps) {
  const label = badgeLabel(badgeId, catalog);
  const icon = badgeIcon(badgeId, catalog);

  if (variant === "muted") {
    return (
      <span className="inline-flex items-center gap-1 border border-surface-container-highest px-1.5 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant">
        <Icon name={icon} className="text-[12px]" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-primary px-1.5 py-0.5 font-mono text-[10px] uppercase text-on-primary">
      <Icon name={icon} className="text-[12px]" />
      {label}
    </span>
  );
}
