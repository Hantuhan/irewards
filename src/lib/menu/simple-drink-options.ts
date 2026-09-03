/**
 * Shared Simple drink options for Coffee, Kopi, and Teh (MY/SG cafe POS).
 * Same option set on every product in those categories.
 */

import type { ModifierGroupInput } from "@/lib/db/modifiers-repository";
import {
  normalizeDrinkSweetness,
  type CoffeeProfile,
  type DrinkSweetness,
} from "@/lib/menu/coffee-profile";
import type { MerchantCurrency } from "@/lib/merchant/currency";

export type DrinkTemperature = "hot" | "iced";
export type DrinkSize = "small" | "regular" | "large";
export type { DrinkSweetness };
export type DrinkIce = "none" | "less" | "regular" | "extra";

export { normalizeDrinkSweetness };

export const DRINK_TEMPERATURE_OPTIONS: Array<{ value: DrinkTemperature; label: string }> = [
  { value: "hot", label: "Hot" },
  { value: "iced", label: "Iced" },
];

export const DRINK_SIZE_OPTIONS: Array<{ value: DrinkSize; label: string; hint: string }> = [
  { value: "small", label: "Small", hint: "8oz" },
  { value: "regular", label: "Regular", hint: "12oz" },
  { value: "large", label: "Large", hint: "16oz" },
];

/** Plain English sweetness — no kopi/teh slang on the POS. */
export const DRINK_SWEETNESS_OPTIONS: Array<{
  value: DrinkSweetness;
  label: string;
  hint: string;
}> = [
  { value: "none", label: "No sugar", hint: "" },
  { value: "less", label: "Less sweet", hint: "" },
  { value: "regular", label: "Regular", hint: "Normal sugar" },
  { value: "extra", label: "Extra sweet", hint: "" },
];

export const DRINK_ICE_OPTIONS: Array<{ value: DrinkIce; label: string }> = [
  { value: "none", label: "No ice" },
  { value: "less", label: "Less ice" },
  { value: "regular", label: "Regular ice" },
  { value: "extra", label: "Extra ice" },
];

function option(
  name: string,
  priceDeltaCents = 0,
  isDefault = false,
): ModifierGroupInput["options"][number] {
  return { name, priceDeltaCents, isDefault, maxQuantity: 1 };
}

function group(
  name: string,
  options: ModifierGroupInput["options"],
  required = true,
): ModifierGroupInput {
  return {
    name,
    required,
    minSelect: required ? 1 : 0,
    maxSelect: 1,
    options,
  };
}

function sizePricing(currency: MerchantCurrency) {
  if (currency === "SGD") return { large: 150 };
  return { large: 200 };
}

export function simpleDrinkModifierTemplate(
  currency: MerchantCurrency,
  profile?: Pick<
    CoffeeProfile,
    "defaultTemperature" | "defaultSize" | "defaultSweetness" | "defaultIce"
  >,
): ModifierGroupInput[] {
  const extra = sizePricing(currency);
  const temp = profile?.defaultTemperature ?? "hot";
  const size = profile?.defaultSize ?? "regular";
  const sweetness = normalizeDrinkSweetness(profile?.defaultSweetness);
  const ice = profile?.defaultIce ?? "regular";

  return [
    group(
      "Temperature",
      DRINK_TEMPERATURE_OPTIONS.map((o) =>
        option(o.label, 0, o.value === temp),
      ),
      true,
    ),
    group(
      "Size",
      DRINK_SIZE_OPTIONS.map((o) =>
        option(
          `${o.label} · ${o.hint}`,
          o.value === "large" ? extra.large : 0,
          o.value === size,
        ),
      ),
      true,
    ),
    group(
      "Sweetness",
      DRINK_SWEETNESS_OPTIONS.map((o) => option(o.label, 0, o.value === sweetness)),
      true,
    ),
    group(
      "Ice",
      DRINK_ICE_OPTIONS.map((o) => option(o.label, 0, o.value === ice)),
      false,
    ),
  ];
}

export const SIMPLE_DRINK_GROUP_NAMES = new Set([
  "temperature",
  "size",
  "sweetness",
  "ice",
]);

export function isSimpleDrinkManagedGroup(name: string): boolean {
  return SIMPLE_DRINK_GROUP_NAMES.has(name.trim().toLowerCase());
}

/** Extra add-on groups only — excludes Temperature / Size / Sweetness / Ice. */
export function simpleDrinkExtraModifierGroups(
  groups: ModifierGroupInput[],
): ModifierGroupInput[] {
  return groups.filter((g) => !isSimpleDrinkManagedGroup(g.name));
}

/** Merge Simple drink groups onto existing modifiers without dropping extras. */
export function ensureSimpleDrinkModifiers(
  existing: ModifierGroupInput[],
  currency: MerchantCurrency,
  profile?: Pick<
    CoffeeProfile,
    "defaultTemperature" | "defaultSize" | "defaultSweetness" | "defaultIce"
  >,
): ModifierGroupInput[] {
  const template = simpleDrinkModifierTemplate(currency, profile);
  const extras = simpleDrinkExtraModifierGroups(existing);
  return [...template, ...extras];
}
