"use client";

import type { TakeawayChargeConfig, TakeawaySurchargeType } from "@/lib/menu/takeaway-charge";
import { DEFAULT_TAKEAWAY_CHARGE } from "@/lib/menu/takeaway-charge";
import type { MerchantCurrency } from "@/lib/merchant/currency";
import { currencyDisplayCode } from "@/lib/merchant/currency";

type MenuTakeawayChargeEditorProps = {
  value: TakeawayChargeConfig;
  onChange: (value: TakeawayChargeConfig) => void;
  currency?: MerchantCurrency;
};

export function MenuTakeawayChargeEditor({
  value,
  onChange,
  currency = "MYR",
}: MenuTakeawayChargeEditorProps) {
  const currencyCode = currencyDisplayCode(currency);

  function patch(partial: Partial<TakeawayChargeConfig>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="h-4 w-4"
        />
        <span className="font-display text-headline-sm text-on-surface">
          Enable takeaway charge for this product
        </span>
      </label>

      {value.enabled && (
        <div className="grid gap-4 border border-surface-container-highest bg-surface-container-low p-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Surcharge type
            </span>
            <select
              value={value.surchargeType}
              onChange={(e) =>
                patch({ surchargeType: e.target.value as TakeawaySurchargeType })
              }
              className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount ({currencyCode})</option>
            </select>
          </label>

          <label>
            <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Surcharge value
            </span>
            <input
              type="number"
              min={0}
              step={value.surchargeType === "percentage" ? 1 : 0.01}
              value={
                value.surchargeType === "fixed"
                  ? (value.surchargeValue / 100).toFixed(2)
                  : value.surchargeValue
              }
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (!Number.isFinite(raw) || raw < 0) return;
                patch({
                  surchargeValue:
                    value.surchargeType === "fixed" ? Math.round(raw * 100) : Math.round(raw),
                });
              }}
              placeholder={value.surchargeType === "percentage" ? "e.g. 20" : "e.g. 1.00"}
              className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-mono"
            />
            <p className="mt-1 text-body-md text-on-surface-variant">
              {value.surchargeType === "percentage"
                ? "Percentage: e.g. 20 = +20% on the item price."
                : `Fixed: ${currencyCode} amount e.g. 1.00 per item.`}
            </p>
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Priority
            </span>
            <input
              type="number"
              min={0}
              value={value.priority}
              onChange={(e) => patch({ priority: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full max-w-xs border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-mono"
            />
            <p className="mt-1 text-body-md text-on-surface-variant">
              Higher number = applied first when multiple product rules overlap.
            </p>
          </label>
        </div>
      )}

      {!value.enabled && (
        <p className="text-body-md text-on-surface-variant">
          No extra charge when diners pack this item to go.
        </p>
      )}
    </div>
  );
}

export function emptyTakeawayCharge(): TakeawayChargeConfig {
  return { ...DEFAULT_TAKEAWAY_CHARGE };
}
