"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import {
  centsToPriceInput,
  currencyDisplayCode,
  formatMerchantPrice,
  parsePriceToCents,
  type MerchantCurrency,
} from "@/lib/merchant/currency";
import { STAMP_SIZE_PRESETS, type StampRewardType } from "@/lib/loyalty/stamps";
import {
  manusDotGridClass,
  manusHeaderBtnClass,
  manusHeaderPrimaryBtnClass,
  manusInputClass,
  manusInsetPanelClass,
  manusLabelClass,
  manusPanelClass,
  manusSectionTitleClass,
} from "@/lib/ui/manus";

type MenuCategory = { id: string; label: string };
type MenuItem = { id: string; name: string; categoryId: string; priceCents: number };

type ProgramForm = {
  cardSize: number;
  rewardType: StampRewardType;
  rewardLabel: string;
  rewardMenuItemId: string | null;
  rewardPercent: number | null;
  rewardCents: number | null;
  qualifyingMenuItemIds: string[];
  qualifyingCategoryIds: string[];
  maxStampsPerOrder: number | null;
  maxStampsPerDay: number | null;
  cartNudgeEnabled: boolean;
};

type PreviewTheme = "forest" | "cream" | "mono";
type StampIconId = "coffee" | "cutlery" | "tag" | "store";

type StampsAdminShellProps = {
  merchantSlug: string;
  onBack?: () => void;
};

const defaultForm = (): ProgramForm => ({
  cardSize: 6,
  rewardType: "free_item",
  rewardLabel: "Free drink",
  rewardMenuItemId: null,
  rewardPercent: null,
  rewardCents: null,
  qualifyingMenuItemIds: [],
  qualifyingCategoryIds: [],
  maxStampsPerOrder: null,
  maxStampsPerDay: null,
  cartNudgeEnabled: true,
});

const THEMES: Record<
  PreviewTheme,
  { label: string; card: string; ink: string; muted: string; stamp: string; empty: string; bar: string; track: string; badge: string }
> = {
  forest: {
    label: "Forest",
    card: "bg-[#1a3d2e]",
    ink: "text-white",
    muted: "text-white/70",
    stamp: "bg-[#0f2a1f] text-[#c8e6c9]",
    empty: "border border-dashed border-white/35 text-white/40",
    bar: "bg-[#c8e6c9]",
    track: "bg-white/20",
    badge: "border-white/30 text-white/90",
  },
  cream: {
    label: "Cream",
    card: "bg-[#fbfbfa]",
    ink: "text-[#1a3d2e]",
    muted: "text-[#1a3d2e]/65",
    stamp: "bg-[#1a3d2e] text-[#fbfbfa]",
    empty: "border border-dashed border-[#1a3d2e]/30 text-[#1a3d2e]/35",
    bar: "bg-[#1a3d2e]",
    track: "bg-[#1a3d2e]/15",
    badge: "border-[#1a3d2e]/30 text-[#1a3d2e]",
  },
  mono: {
    label: "Mono",
    card: "bg-[#111111]",
    ink: "text-white",
    muted: "text-white/60",
    stamp: "bg-white text-[#111111]",
    empty: "border border-dashed border-white/30 text-white/35",
    bar: "bg-white",
    track: "bg-white/20",
    badge: "border-white/35 text-white/90",
  },
};

const STAMP_ICONS: { id: StampIconId; icon: string; label: string }[] = [
  { id: "coffee", icon: "local_cafe", label: "Cafe" },
  { id: "cutlery", icon: "restaurant", label: "Dining" },
  { id: "tag", icon: "sell", label: "Deal" },
  { id: "store", icon: "storefront", label: "Store" },
];

function ChoiceTick({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        selected
          ? "border-[#1a3d2e] bg-[#1a3d2e] text-white"
          : "border-surface-container-highest bg-white text-transparent"
      }`}
      aria-hidden
    >
      <Icon name="check" className="text-[14px]" />
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#1a3d2e]" : "bg-surface-container-highest"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className={`grid gap-1 p-1 ${manusInsetPanelClass}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-3 py-2.5 font-display text-headline-sm transition-colors ${
            value === opt.id
              ? "bg-[#1a3d2e] text-white"
              : "bg-white text-on-surface-variant hover:text-[#1a3d2e]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StampsAdminShell({ merchantSlug, onBack }: StampsAdminShellProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [cafeName, setCafeName] = useState(merchantSlug);
  const [currency, setCurrency] = useState<MerchantCurrency>("MYR");
  const [form, setForm] = useState<ProgramForm>(defaultForm);
  const [customSize, setCustomSize] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [earnMode, setEarnMode] = useState<"categories" | "items">("categories");
  const [itemTabId, setItemTabId] = useState<string>("");
  const [theme, setTheme] = useState<PreviewTheme>("forest");
  const [stampIcon, setStampIcon] = useState<StampIconId>("coffee");
  const [displayName, setDisplayName] = useState("");
  const [previewFilled, setPreviewFilled] = useState(3);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stampsJson, settings] = await Promise.all([
        merchantApi<{
          enabled: boolean;
          program: ProgramForm;
          menu: { categories: MenuCategory[]; items: MenuItem[] };
        }>(`/api/merchant/${merchantSlug}/stamps`),
        merchantApi<{ name?: string; currency?: MerchantCurrency }>(
          `/api/merchant/${merchantSlug}/settings`,
        ).catch(() => ({ name: merchantSlug, currency: "MYR" as const })),
      ]);
      setEnabled(stampsJson.enabled);
      const program = { ...defaultForm(), ...stampsJson.program };
      setForm(program);
      setCustomSize(!STAMP_SIZE_PRESETS.includes(program.cardSize as 3 | 6 | 9 | 12));
      setCategories(stampsJson.menu.categories);
      setItems(stampsJson.menu.items);
      const mode: "categories" | "items" =
        program.qualifyingCategoryIds.length > 0 ||
        program.qualifyingMenuItemIds.length === 0
          ? "categories"
          : "items";
      setEarnMode(mode);
      setItemTabId(stampsJson.menu.categories[0]?.id ?? "");
      const name = settings.name?.trim() || merchantSlug;
      setCafeName(name);
      setCurrency(settings.currency === "SGD" ? "SGD" : "MYR");
      setDisplayName((prev) => prev || name);
      setPreviewFilled(Math.min(3, Math.max(0, program.cardSize - 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const qualifyingCategorySet = useMemo(
    () => new Set(form.qualifyingCategoryIds),
    [form.qualifyingCategoryIds],
  );
  const qualifyingItemSet = useMemo(
    () => new Set(form.qualifyingMenuItemIds),
    [form.qualifyingMenuItemIds],
  );

  const itemsInTab = useMemo(() => {
    if (!itemTabId) return items;
    return items.filter((i) => i.categoryId === itemTabId);
  }, [itemTabId, items]);

  const earnSummaryText = useMemo(() => {
    if (earnMode === "categories") {
      const labels = categories
        .filter((c) => qualifyingCategorySet.has(c.id))
        .map((c) => c.label);
      if (labels.length === 0) return null;
      return `Earns on: ${labels.join(", ")}`;
    }
    const names = items.filter((i) => qualifyingItemSet.has(i.id)).map((i) => i.name);
    if (names.length === 0) return null;
    if (names.length <= 4) return `Earns on: ${names.join(", ")}`;
    return `Earns on: ${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  }, [earnMode, categories, items, qualifyingCategorySet, qualifyingItemSet]);

  const hasEarnSelection =
    earnMode === "categories"
      ? form.qualifyingCategoryIds.length > 0
      : form.qualifyingMenuItemIds.length > 0;

  const moneyCode = currencyDisplayCode(currency);

  const rewardPreviewText = useMemo(() => {
    if (form.rewardType === "free_item") {
      const item = items.find((i) => i.id === form.rewardMenuItemId);
      return item ? `Free ${item.name}` : form.rewardLabel || "Free item";
    }
    if (form.rewardType === "percent_off") {
      const pct = form.rewardPercent ?? 0;
      return pct > 0 ? `${pct}% off your bill` : form.rewardLabel || "% off";
    }
    if (form.rewardCents != null && form.rewardCents > 0) {
      return `${formatMerchantPrice(form.rewardCents, currency)} off`;
    }
    return form.rewardLabel || "Reward";
  }, [form, items, currency]);

  const multiStampOn = form.maxStampsPerOrder == null || form.maxStampsPerOrder > 1;
  const themeStyle = THEMES[theme];
  const filledIcon = STAMP_ICONS.find((i) => i.id === stampIcon)?.icon ?? "local_cafe";
  const progressPct = Math.round((previewFilled / Math.max(1, form.cardSize)) * 1000) / 10;

  function patchForm(patch: Partial<ProgramForm>) {
    setForm((p) => ({ ...p, ...patch }));
    setSaved(false);
  }

  function switchEarnMode(mode: "categories" | "items") {
    setEarnMode(mode);
    if (mode === "categories") {
      patchForm({ qualifyingMenuItemIds: [] });
    } else {
      patchForm({ qualifyingCategoryIds: [] });
      if (!itemTabId && categories[0]) setItemTabId(categories[0].id);
    }
    setSaved(false);
  }

  function toggleCategory(id: string) {
    setForm((prev) => {
      const has = prev.qualifyingCategoryIds.includes(id);
      return {
        ...prev,
        qualifyingCategoryIds: has
          ? prev.qualifyingCategoryIds.filter((x) => x !== id)
          : [...prev.qualifyingCategoryIds, id],
        qualifyingMenuItemIds: [],
      };
    });
    setSaved(false);
  }

  function toggleItem(id: string) {
    setForm((prev) => {
      const has = prev.qualifyingMenuItemIds.includes(id);
      return {
        ...prev,
        qualifyingMenuItemIds: has
          ? prev.qualifyingMenuItemIds.filter((x) => x !== id)
          : [...prev.qualifyingMenuItemIds, id],
        qualifyingCategoryIds: [],
      };
    });
    setSaved(false);
  }

  function selectAllInTab() {
    const ids = itemsInTab.map((i) => i.id);
    setForm((prev) => ({
      ...prev,
      qualifyingMenuItemIds: Array.from(new Set([...prev.qualifyingMenuItemIds, ...ids])),
      qualifyingCategoryIds: [],
    }));
    setSaved(false);
  }

  function clearAllItems() {
    patchForm({ qualifyingMenuItemIds: [] });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload =
        earnMode === "categories"
          ? { ...form, qualifyingMenuItemIds: [] as string[] }
          : { ...form, qualifyingCategoryIds: [] as string[] };
      const json = await merchantApi<{ enabled: boolean; program: ProgramForm }>(
        `/api/merchant/${merchantSlug}/stamps`,
        {
          method: "PUT",
          body: JSON.stringify({ enabled, ...payload }),
        },
      );
      setEnabled(json.enabled);
      setForm({ ...defaultForm(), ...json.program });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    void load();
    setSaved(false);
  }

  const headerActions = (
    <div className="flex flex-nowrap items-center gap-2">
      {onBack && (
        <button type="button" onClick={onBack} className={manusHeaderBtnClass}>
          <Icon name="arrow_back" className="text-[16px]" />
          Hub
        </button>
      )}
      <button
        type="button"
        onClick={discard}
        disabled={loading || saving}
        className={`${manusHeaderBtnClass} text-on-surface-variant`}
      >
        Discard
      </button>
      <button
        type="button"
        disabled={saving || loading || !hasEarnSelection}
        onClick={() => void save()}
        className={manusHeaderPrimaryBtnClass}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="rewards"
      title="Digital stamp card"
      eyebrow="Settings · Loyalty · Stamps"
      headerAction={headerActions}
    >
      {loading && <p className="text-on-surface-variant">Loading…</p>}
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-3 text-body-md text-red-800" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mb-4 border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 p-3 text-body-md text-[#1a3d2e]">
          Stamp program saved.
        </p>
      )}

      {!loading && (
        <div className={`-mx-1 px-1 py-1 ${manusDotGridClass}`}>
          <p className="mb-5 max-w-3xl text-[14px] leading-relaxed text-on-surface-variant">
            Configure stamp size, what earns a stamp, caps, and the reward when the card is full —
            then check the live customer preview.
          </p>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_min(100%,380px)]">
            <div className="space-y-4">
              {/* Module */}
              <section className={`${manusPanelClass} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className={manusLabelClass}>Module</p>
                    <h2 className={`mt-1 ${manusSectionTitleClass}`}>Show stamps on storefront</h2>
                    <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-on-surface-variant">
                      WhatsApp members collect stamps after payment. Guests can still order.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className={manusLabelClass}>{enabled ? "On" : "Off"}</span>
                    <Toggle
                      checked={enabled}
                      onChange={(v) => {
                        setEnabled(v);
                        setSaved(false);
                      }}
                      label="Enable stamps"
                    />
                  </div>
                </div>
              </section>

              {/* Earning mechanics */}
              <section className={`${manusPanelClass} p-5`}>
                <p className={manusLabelClass}>Stamp earning mechanics</p>
                <h2 className={`mt-1 ${manusSectionTitleClass}`}>How members fill the card</h2>
                <p className="mt-1 text-[14px] text-on-surface-variant">
                  Set card size, multi-stamp bills, and which menu items count.
                </p>

                <div className="mt-5">
                  <p className={manusLabelClass}>Stamp cycle size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STAMP_SIZE_PRESETS.map((n) => {
                      const selected = !customSize && form.cardSize === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setCustomSize(false);
                            patchForm({ cardSize: n });
                            setPreviewFilled((f) => Math.min(f, n));
                          }}
                          className={`inline-flex items-center gap-2 border px-4 py-2.5 ${
                            selected
                              ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                              : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40"
                          }`}
                        >
                          <ChoiceTick selected={selected} />
                          <span className="font-display text-headline-sm text-[#1a3d2e]">
                            {n} stamps
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCustomSize(true)}
                      className={`inline-flex items-center gap-2 border px-4 py-2.5 ${
                        customSize
                          ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                          : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40"
                      }`}
                    >
                      <ChoiceTick selected={customSize} />
                      <span className="font-display text-headline-sm text-[#1a3d2e]">Custom</span>
                    </button>
                  </div>
                  {customSize && (
                    <label className="mt-4 block max-w-[12rem]">
                      <span className={manusLabelClass}>Size (2–20)</span>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={form.cardSize}
                        onChange={(e) => {
                          const n = Number(e.target.value) || 6;
                          patchForm({ cardSize: n });
                          setPreviewFilled((f) => Math.min(f, n));
                        }}
                        className={manusInputClass}
                      />
                    </label>
                  )}
                </div>

                <div
                  className={`mt-5 flex flex-wrap items-center justify-between gap-3 p-4 ${manusInsetPanelClass}`}
                >
                  <div>
                    <p className="font-display text-headline-sm text-[#1a3d2e]">
                      Multiple stamps per bill
                    </p>
                    <p className="mt-0.5 text-[13px] text-on-surface-variant">
                      Two coffees → two stamps.
                    </p>
                  </div>
                  <Toggle
                    checked={multiStampOn}
                    onChange={(on) => patchForm({ maxStampsPerOrder: on ? null : 1 })}
                    label="Allow multiple stamps per bill"
                  />
                </div>

                <div
                  className={`mt-5 flex flex-wrap items-center justify-between gap-3 p-4 ${manusInsetPanelClass}`}
                >
                  <div>
                    <p className="font-display text-headline-sm text-[#1a3d2e]">
                      Pay bar stamp nudge
                    </p>
                    <p className="mt-0.5 max-w-md text-[13px] text-on-surface-variant">
                      On the menu, show members “Add [qualifying item] for +1 stamp?” above Pay
                      when stamps are on and something stampable is still missing from the cart.
                    </p>
                  </div>
                  <Toggle
                    checked={form.cartNudgeEnabled}
                    onChange={(on) => patchForm({ cartNudgeEnabled: on })}
                    label="Show stamp nudge on Pay bar"
                  />
                </div>

                <div className="mt-5 border-t border-surface-container-highest pt-5">
                  <p className={manusLabelClass}>What earns a stamp</p>
                  <p className="mt-1 text-[14px] text-on-surface-variant">
                    1 qualifying item = 1 stamp.
                  </p>
                  <div className="mt-3">
                    <Segmented
                      value={earnMode}
                      onChange={switchEarnMode}
                      options={[
                        { id: "categories", label: "Whole menu tabs" },
                        { id: "items", label: "Specific products" },
                      ]}
                    />
                    <p className="mt-2 text-[13px] text-on-surface-variant">
                      {earnMode === "categories"
                        ? "Tick a tab — every item in that tab counts."
                        : "Pick a tab, then tick only the products that count."}
                    </p>
                  </div>

                  {earnSummaryText && (
                    <p
                      className={`mt-3 px-3 py-2 text-[14px] text-on-surface ${manusInsetPanelClass}`}
                    >
                      {earnSummaryText}
                    </p>
                  )}
                  {!hasEarnSelection && (
                    <p className="mt-3 border border-amber-700/25 bg-amber-50 px-3 py-2 text-[14px] text-amber-950">
                      {earnMode === "categories"
                        ? "Pick at least one menu tab."
                        : "Pick at least one product."}
                    </p>
                  )}

                  {earnMode === "categories" && (
                    <div className={`mt-4 max-h-64 overflow-y-auto ${manusInsetPanelClass}`}>
                      {categories.length === 0 && (
                        <p className="px-4 py-4 text-[14px] text-on-surface-variant">
                          Add menu tabs under Menu first.
                        </p>
                      )}
                      {categories.map((c) => {
                        const on = qualifyingCategorySet.has(c.id);
                        const count = items.filter((i) => i.categoryId === c.id).length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className="flex w-full items-center gap-3 border-b border-surface-container-highest bg-white px-4 py-3 text-left last:border-b-0 hover:bg-[#1a3d2e]/[0.03]"
                          >
                            <ChoiceTick selected={on} />
                            <span className="min-w-0 flex-1 font-display text-headline-sm text-[#1a3d2e]">
                              {c.label}
                            </span>
                            <span className={manusLabelClass}>
                              {count} item{count === 1 ? "" : "s"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {earnMode === "items" && (
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className={manusLabelClass}>Menu tab</span>
                        <select
                          value={itemTabId}
                          onChange={(e) => setItemTabId(e.target.value)}
                          className={manusInputClass}
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={selectAllInTab}
                          className="font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e] underline"
                        >
                          Select all in tab
                        </button>
                        <button
                          type="button"
                          onClick={clearAllItems}
                          className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className={`max-h-56 overflow-y-auto ${manusInsetPanelClass}`}>
                        {itemsInTab.length === 0 && (
                          <p className="px-4 py-4 text-[14px] text-on-surface-variant">
                            No products in this tab.
                          </p>
                        )}
                        {itemsInTab.map((item) => {
                          const on = qualifyingItemSet.has(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleItem(item.id)}
                              className="flex w-full items-center gap-3 border-b border-surface-container-highest bg-white px-4 py-2.5 text-left last:border-b-0"
                            >
                              <ChoiceTick selected={on} />
                              <span className="min-w-0 flex-1 text-[14px] text-on-surface">
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {form.qualifyingMenuItemIds.length > 0 && (
                        <p className="text-[13px] text-on-surface-variant">
                          {form.qualifyingMenuItemIds.length} product
                          {form.qualifyingMenuItemIds.length === 1 ? "" : "s"} selected.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Caps */}
              <section className={`${manusPanelClass} p-5`}>
                <p className={manusLabelClass}>Caps & limits</p>
                <h2 className={`mt-1 ${manusSectionTitleClass}`}>Keep stamp earning fair</h2>
                <p className="mt-1 text-[14px] text-on-surface-variant">
                  Optional ceilings per order and per day. Leave blank for no cap.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={manusLabelClass}>Max stamps per order</span>
                    <input
                      type="number"
                      min={1}
                      value={form.maxStampsPerOrder ?? ""}
                      onChange={(e) =>
                        patchForm({
                          maxStampsPerOrder:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Unlimited"
                      className={manusInputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={manusLabelClass}>Max stamps per day</span>
                    <input
                      type="number"
                      min={1}
                      value={form.maxStampsPerDay ?? ""}
                      onChange={(e) =>
                        patchForm({
                          maxStampsPerDay:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Unlimited"
                      className={manusInputClass}
                    />
                  </label>
                </div>
              </section>

              {/* Reward */}
              <section className={`${manusPanelClass} p-5`}>
                <p className={manusLabelClass}>Card completion reward</p>
                <h2 className={`mt-1 ${manusSectionTitleClass}`}>When the card is full</h2>
                <p className="mt-1 text-[14px] text-on-surface-variant">
                  After {form.cardSize} stamps, member taps Redeem — applies on next order.
                </p>

                <div className="mt-4">
                  <p className={`mb-2 ${manusLabelClass}`}>Reward type</p>
                  <Segmented
                    value={form.rewardType}
                    onChange={(id) => {
                      if (id === "free_item") patchForm({ rewardType: "free_item" });
                      else if (id === "percent_off") {
                        patchForm({
                          rewardType: "percent_off",
                          rewardMenuItemId: null,
                          rewardLabel:
                            form.rewardPercent != null
                              ? `${form.rewardPercent}% off`
                              : "Discount",
                        });
                      } else {
                        patchForm({
                          rewardType: "fixed_off",
                          rewardMenuItemId: null,
                          rewardLabel:
                            form.rewardCents != null
                              ? `${formatMerchantPrice(form.rewardCents, currency)} off`
                              : "Discount",
                        });
                      }
                    }}
                    options={[
                      { id: "free_item", label: "Free item" },
                      { id: "percent_off", label: "% off bill" },
                      { id: "fixed_off", label: `${moneyCode} off` },
                    ]}
                  />
                </div>

                {form.rewardType === "free_item" && (
                  <label className="mt-4 block">
                    <span className={manusLabelClass}>Which free item?</span>
                    <select
                      value={form.rewardMenuItemId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        const item = items.find((i) => i.id === id);
                        patchForm({
                          rewardMenuItemId: id,
                          rewardCents: item?.priceCents ?? null,
                          rewardLabel: item ? `Free ${item.name}` : "Free item",
                        });
                      }}
                      className={manusInputClass}
                    >
                      <option value="">Pick from menu…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} · {formatMerchantPrice(i.priceCents, currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {form.rewardType === "percent_off" && (
                  <label className="mt-4 block max-w-xs">
                    <span className={manusLabelClass}>How much % off?</span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={form.rewardPercent ?? ""}
                        onChange={(e) => {
                          const pct = e.target.value === "" ? null : Number(e.target.value);
                          patchForm({
                            rewardPercent: pct,
                            rewardLabel: pct != null ? `${pct}% off` : "Discount",
                          });
                        }}
                        className={`${manusInputClass} mt-0 w-24`}
                      />
                      <span className="text-on-surface-variant">%</span>
                    </div>
                  </label>
                )}

                {form.rewardType === "fixed_off" && (
                  <label className="mt-4 block max-w-xs">
                    <span className={manusLabelClass}>How much off?</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-on-surface-variant">{moneyCode}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={
                          form.rewardCents != null ? centsToPriceInput(form.rewardCents) : ""
                        }
                        onChange={(e) => {
                          const cents =
                            e.target.value.trim() === ""
                              ? null
                              : parsePriceToCents(e.target.value);
                          patchForm({
                            rewardCents: cents,
                            rewardLabel:
                              cents != null
                                ? `${formatMerchantPrice(cents, currency)} off`
                                : "Discount",
                          });
                        }}
                        className={`${manusInputClass} mt-0 w-32`}
                        placeholder="5.00"
                      />
                    </div>
                  </label>
                )}

                <div className="mt-4 border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={manusLabelClass}>Card completion · {form.cardSize} stamps</p>
                      <p className="mt-1 font-display text-headline-sm text-[#1a3d2e]">
                        {rewardPreviewText}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1a3d2e]/70">
                      Auto on redeem
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Live preview */}
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <div className={`${manusPanelClass} p-5`}>
                <p className={manusLabelClass}>Live customer preview</p>
                <h2 className={`mt-1 ${manusSectionTitleClass}`}>What members see</h2>

                <div className="mt-4">
                  <p className={`mb-2 ${manusLabelClass}`}>Card visual theme</p>
                  <Segmented
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { id: "forest", label: "Forest" },
                      { id: "cream", label: "Cream" },
                      { id: "mono", label: "Mono" },
                    ]}
                  />
                </div>

                <div className={`mt-4 overflow-hidden p-5 ${themeStyle.card} ${themeStyle.ink}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`font-mono text-[9px] uppercase tracking-[0.2em] ${themeStyle.muted}`}
                      >
                        Stamp card
                      </p>
                      <p className="mt-1 font-display text-lg leading-tight">
                        {displayName.trim() || cafeName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${themeStyle.badge}`}
                    >
                      Member
                    </span>
                  </div>

                  <p className={`mt-3 font-display text-[15px] leading-snug ${themeStyle.ink}`}>
                    Collect {form.cardSize} stamps, unlock {rewardPreviewText}
                  </p>

                  <div
                    className="mx-auto mt-4 grid w-full max-w-[272px] gap-2.5"
                    style={{
                      gridTemplateColumns: `repeat(${
                        form.cardSize === 6 || form.cardSize === 5
                          ? 3
                          : form.cardSize <= 3
                            ? form.cardSize
                            : form.cardSize <= 8
                              ? 4
                              : form.cardSize <= 10
                                ? 5
                                : 4
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: form.cardSize }, (_, i) => {
                      const filled = i < previewFilled;
                      const isGoal = i === form.cardSize - 1;
                      return (
                        <span
                          key={i}
                          className={`relative flex aspect-square flex-col items-center justify-center ${
                            filled ? themeStyle.stamp : themeStyle.empty
                          }`}
                        >
                          {filled ? (
                            <Icon name={filledIcon} className="text-[18px]" filled />
                          ) : isGoal ? (
                            <>
                              <Icon name="emoji_events" className="text-[16px]" />
                              <span className="mt-0.5 font-mono text-[8px] uppercase tracking-wider">
                                Goal
                              </span>
                            </>
                          ) : (
                            <span className="text-sm">+</span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider">
                      <span className={themeStyle.muted}>
                        {previewFilled} of {form.cardSize} stamps
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className={`h-1.5 w-full ${themeStyle.track}`}>
                      <div
                        className={`h-full ${themeStyle.bar} transition-all`}
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>

                  <div
                    className={`mt-4 flex justify-between border-t pt-3 font-mono text-[9px] uppercase tracking-[0.14em] ${
                      theme === "cream" ? "border-[#1a3d2e]/15" : "border-white/15"
                    } ${themeStyle.muted}`}
                  >
                    <span>WhatsApp member</span>
                    <span>Redeem when full</span>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className={manusLabelClass}>Preview fill (demo)</span>
                  <input
                    type="range"
                    min={0}
                    max={form.cardSize}
                    value={previewFilled}
                    onChange={(e) => setPreviewFilled(Number(e.target.value))}
                    className="mt-2 w-full accent-[#1a3d2e]"
                  />
                </label>

                <div className="mt-5 border-t border-surface-container-highest pt-5">
                  <p className={manusLabelClass}>Stamp icon graphic</p>
                  <div className="mt-2 flex gap-2">
                    {STAMP_ICONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={() => setStampIcon(opt.id)}
                        className={`flex h-11 w-11 items-center justify-center border ${
                          stampIcon === opt.id
                            ? "border-[#1a3d2e] bg-[#1a3d2e] text-white"
                            : "border-surface-container-highest bg-white text-on-surface-variant"
                        }`}
                      >
                        <Icon name={opt.icon} className="text-xl" />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className={manusLabelClass}>Customer card display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={cafeName}
                    className={manusInputClass}
                  />
                  <p className="mt-1 text-[12px] text-on-surface-variant">
                    Preview only — storefront still uses your cafe name.
                  </p>
                </label>

                <div className={`mt-5 p-4 ${manusInsetPanelClass}`}>
                  <p className={manusLabelClass}>WhatsApp after payment</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">
                    Members collect stamps from the WhatsApp link after they pay — no extra POS
                    claim code needed.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
