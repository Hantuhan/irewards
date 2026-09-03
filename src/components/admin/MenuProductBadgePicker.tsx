"use client";

import { Icon } from "@/components/ui/Icon";
import type { MenuBadge } from "@/lib/menu/menu-badges";

type MenuProductBadgePickerProps = {
  catalog: MenuBadge[];
  value: string[];
  onChange: (tags: string[]) => void;
  onCustomize?: () => void;
};

export function MenuProductBadgePicker({
  catalog,
  value,
  onChange,
  onCustomize,
}: MenuProductBadgePickerProps) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      {catalog.map((badge) => {
        const selected = value.includes(badge.id);
        return (
          <button
            key={badge.id}
            type="button"
            onClick={() => toggle(badge.id)}
            className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
              selected
                ? "border-primary bg-primary text-on-primary"
                : "border-surface-container-highest hover:border-primary/40"
            }`}
          >
            <Icon
              name={badge.icon}
              className={selected ? "text-on-primary" : "text-on-surface-variant"}
            />
            <span
              className={`font-display text-headline-sm ${
                selected ? "text-on-primary" : "text-on-surface"
              }`}
            >
              {badge.label}
            </span>
            {selected && (
              <Icon name="check_circle" className="ml-auto text-on-primary" filled />
            )}
          </button>
        );
      })}
      {onCustomize && (
        <button
          type="button"
          onClick={onCustomize}
          className="mt-1 text-left font-mono text-label-mono text-primary underline"
        >
          Customize badges
        </button>
      )}
    </div>
  );
}
