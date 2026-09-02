"use client";

import { Icon } from "@/components/ui/Icon";
import type { ServiceType } from "@/lib/menu/takeaway-charge";

type ServiceTypePickerProps = {
  value: ServiceType;
  onChange: (value: ServiceType) => void;
};

export function ServiceTypePicker({ value, onChange }: ServiceTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          { id: "dine_in" as const, label: "Dine in", icon: "restaurant" },
          { id: "takeaway" as const, label: "Take away", icon: "shopping_bag" },
        ] as const
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`flex items-center justify-center gap-2 border px-4 py-3 font-display text-headline-sm transition-colors ${
            value === option.id
              ? "border-primary bg-primary text-on-primary"
              : "border-surface-container-highest text-on-surface-variant"
          }`}
        >
          <Icon name={option.icon} />
          {option.label}
        </button>
      ))}
    </div>
  );
}
