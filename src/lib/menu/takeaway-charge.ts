export type TakeawaySurchargeType = "percentage" | "fixed";

export type TakeawayChargeConfig = {
  enabled: boolean;
  surchargeType: TakeawaySurchargeType;
  /** Percentage points (e.g. 20 = +20%) or fixed amount in cents. */
  surchargeValue: number;
  priority: number;
};

export type ServiceType = "dine_in" | "takeaway";

export const DEFAULT_TAKEAWAY_CHARGE: TakeawayChargeConfig = {
  enabled: true,
  surchargeType: "fixed",
  /** Default packaging fee: RM/SGD 1.00 */
  surchargeValue: 100,
  priority: 10,
};

export function takeawayChargeFromRow(row: {
  takeaway_charge_enabled?: boolean | null;
  takeaway_surcharge_type?: string | null;
  takeaway_surcharge_value?: number | string | null;
  takeaway_surcharge_priority?: number | null;
}): TakeawayChargeConfig {
  const type = row.takeaway_surcharge_type === "fixed" ? "fixed" : "percentage";
  return {
    enabled: row.takeaway_charge_enabled ?? false,
    surchargeType: type,
    surchargeValue: Number(row.takeaway_surcharge_value ?? 0),
    priority: row.takeaway_surcharge_priority ?? 10,
  };
}

export function calculateTakeawaySurchargeCents(
  unitPriceCents: number,
  config: TakeawayChargeConfig,
): number {
  if (!config.enabled || config.surchargeValue <= 0) return 0;
  if (config.surchargeType === "percentage") {
    return Math.round((unitPriceCents * config.surchargeValue) / 100);
  }
  return Math.round(config.surchargeValue);
}

export function shouldApplyTakeawayCharge(
  serviceType: ServiceType,
  packedForTakeaway: boolean,
): boolean {
  if (serviceType === "takeaway") return true;
  return packedForTakeaway;
}

export function formatTakeawaySurchargeSummary(
  config: TakeawayChargeConfig,
  currencyCode: "MYR" | "SGD" = "MYR",
): string {
  if (!config.enabled) return "No takeaway charge";
  const symbol = currencyCode === "SGD" ? "SGD" : "RM";
  if (config.surchargeType === "percentage") {
    return `+${config.surchargeValue}% when packed to go`;
  }
  return `+${symbol} ${(config.surchargeValue / 100).toFixed(2)} when packed to go`;
}
