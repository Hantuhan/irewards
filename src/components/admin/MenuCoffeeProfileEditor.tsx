"use client";

import type { CoffeeProfile } from "@/lib/menu/coffee-profile";
import {
  DRINK_ICE_OPTIONS,
  DRINK_SIZE_OPTIONS,
  DRINK_SWEETNESS_OPTIONS,
  DRINK_TEMPERATURE_OPTIONS,
} from "@/lib/menu/simple-drink-options";

type MenuCoffeeProfileEditorProps = {
  value: CoffeeProfile;
  onChange: (next: CoffeeProfile) => void;
};

function ChipRow<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T | undefined;
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-on-surface-variant">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`border px-3 py-1.5 text-body-md transition-colors ${
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-surface-container-highest bg-white text-on-surface-variant"
              }`}
            >
              {option.label}
              {option.hint ? (
                <span className={`ml-1 text-[11px] ${selected ? "text-on-primary/80" : ""}`}>
                  {option.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MenuCoffeeProfileEditor({ value, onChange }: MenuCoffeeProfileEditorProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Order defaults
        </p>
        <p className="mt-1 text-body-md text-on-surface-variant">
          What diners see first when they customise this drink. Same options for Coffee, Kopi, and
          Teh.
        </p>
      </div>

      <div className="flex flex-col gap-5 border border-surface-container-highest bg-surface-container-low p-4">
        <ChipRow
          label="Temperature"
          hint="Default diners see first"
          options={DRINK_TEMPERATURE_OPTIONS}
          value={value.defaultTemperature ?? "hot"}
          onChange={(defaultTemperature) =>
            onChange({ ...value, kind: "drink", detailLevel: "simple", defaultTemperature })
          }
        />
        <ChipRow
          label="Size"
          hint="Regular is the base price · Large adds a surcharge"
          options={DRINK_SIZE_OPTIONS}
          value={value.defaultSize ?? "regular"}
          onChange={(defaultSize) =>
            onChange({ ...value, kind: "drink", detailLevel: "simple", defaultSize })
          }
        />
        <ChipRow
          label="Sweetness"
          hint="Default sugar level for this drink"
          options={DRINK_SWEETNESS_OPTIONS}
          value={value.defaultSweetness ?? "regular"}
          onChange={(defaultSweetness) =>
            onChange({ ...value, kind: "drink", detailLevel: "simple", defaultSweetness })
          }
        />
        <ChipRow
          label="Ice"
          hint="Used when the drink is iced"
          options={DRINK_ICE_OPTIONS}
          value={value.defaultIce ?? "regular"}
          onChange={(defaultIce) =>
            onChange({ ...value, kind: "drink", detailLevel: "simple", defaultIce })
          }
        />
      </div>
    </div>
  );
}
