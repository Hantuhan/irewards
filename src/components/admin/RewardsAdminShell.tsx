"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PointsCopilotPanel } from "@/components/admin/PointsCopilotPanel";
import { PointsRoiPanel } from "@/components/admin/PointsRoiPanel";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import {
  resolveLocalized,
  rewardsAdminCopy,
  withLocalized,
  type ProgramLanguage,
} from "@/lib/i18n/program-locale";
import {
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  conditionValueOptions,
  formatConditionDisplay,
  summarizePointsRule,
  type PointsRule,
  type PointsRuleCondition,
  type PointsRuleItemCondition,
} from "@/lib/loyalty/points-rules";
import { tierCardGradient } from "@/lib/loyalty/reward-level-map";
import {
  DEFAULT_REWARD_LEVELS,
  normalizeRewardLevels,
  type RewardLevelConfig,
} from "@/lib/loyalty/default-reward-levels";
import {
  suggestPointsProgram,
  suggestHigherEarn,
  suggestLowerEarn,
  type PointsCopilotSuggestion,
} from "@/lib/loyalty/points-copilot";

type RewardLevel = RewardLevelConfig;

type ProgramSettings = {
  pointsPerRinggit: number;
  pointsRedeemCentsPerPoint: number;
};

type MenuItem = { id: string; name: string };

type TabId = "points" | "roi" | "rules" | "tiers";

const TABS: { id: TabId; label: string }[] = [
  { id: "points", label: "Points" },
  { id: "roi", label: "ROI calculator" },
  { id: "rules", label: "Points rule" },
  { id: "tiers", label: "Membership" },
];

const MATRIX_ROWS: {
  key: keyof Pick<
    RewardLevel,
    | "tierActive"
    | "pointExpiryDays"
    | "birthdayPoints"
    | "welcomeRewards"
    | "welcomePoints"
    | "renewRewards"
    | "renewPoints"
    | "validityMonths"
  >;
  label: string;
  hint: string;
  format?: (v: unknown) => string;
}[] = [
  {
    key: "tierActive",
    label: "Tier enabled",
    hint: "When off, diners cannot reach this tier",
    format: (v) => (v ? "✓" : "—"),
  },
  {
    key: "pointExpiryDays",
    label: "Points expire",
    hint: "Days until unused points expire (leave blank for no expiry)",
    format: (v) => (v == null ? "—" : `${v} days`),
  },
  {
    key: "birthdayPoints",
    label: "Birthday bonus",
    hint: "Extra points awarded on the member's birthday",
    format: (v) => `${v} pts`,
  },
  {
    key: "welcomeRewards",
    label: "Welcome freebies",
    hint: "Free reward vouchers when a member first reaches this tier",
    format: (v) => ((v as number) > 0 ? `${v} reward(s)` : "—"),
  },
  {
    key: "welcomePoints",
    label: "Welcome bonus",
    hint: "Bonus points when a member first reaches this tier",
    format: (v) => ((v as number) > 0 ? `${v} pts` : "—"),
  },
  {
    key: "renewRewards",
    label: "Renewal freebies",
    hint: "Free reward vouchers when the tier renews",
    format: (v) => ((v as number) > 0 ? `${v} reward(s)` : "—"),
  },
  {
    key: "renewPoints",
    label: "Renewal bonus",
    hint: "Bonus points when the tier renews",
    format: (v) => ((v as number) > 0 ? `${v} pts` : "—"),
  },
  {
    key: "validityMonths",
    label: "Tier duration",
    hint: "Months before the tier renews (leave blank for lifetime)",
    format: (v) => (v == null ? "—" : `${v} months`),
  },
];

const inputClass =
  "w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md outline-none focus:border-primary";

const selectClass =
  "border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md outline-none focus:border-primary";

type RewardsAdminShellProps = { merchantSlug: string };

export function RewardsAdminShell({ merchantSlug }: RewardsAdminShellProps) {
  const [tab, setTab] = useState<TabId>("tiers");
  const [levels, setLevels] = useState<RewardLevel[]>(() => [...DEFAULT_REWARD_LEVELS]);
  const [settings, setSettings] = useState<ProgramSettings>({
    pointsPerRinggit: 0.1,
    pointsRedeemCentsPerPoint: 10,
  });
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [draftCondition, setDraftCondition] = useState<PointsRuleCondition>({
    field: "member_tier",
    operator: "is",
    value: "",
  });
  const [draftItemId, setDraftItemId] = useState("");
  const [copilot, setCopilot] = useState<PointsCopilotSuggestion | null>(null);
  const [programLang, setProgramLang] = useState<ProgramLanguage>("en");
  const [, setMerchantLanguages] = useState<ProgramLanguage[]>(["en"]);
  const [currency, setCurrency] = useState<"MYR" | "SGD">("MYR");

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;

  useEffect(() => {
    if (levels.length > 0) {
      const localizedLevels = levels.map((l) => ({
        name: resolveLocalized(l.nameI18n, programLang, l.name),
        pointsMultiplier: l.pointsMultiplier,
      }));
      setCopilot(
        suggestPointsProgram(localizedLevels, {
          pointsPerRinggit: settings.pointsPerRinggit,
          pointsRedeemCentsPerPoint: settings.pointsRedeemCentsPerPoint,
        }),
      );
    }
  }, [levels, settings.pointsPerRinggit, settings.pointsRedeemCentsPerPoint, programLang]);

  async function applyCopilot(suggestion: PointsCopilotSuggestion) {
    setSettings({
      ...settings,
      pointsPerRinggit: suggestion.pointsPerRinggit,
      pointsRedeemCentsPerPoint: suggestion.pointsRedeemCentsPerPoint,
    });
    setSaving(true);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          pointsPerRinggit: suggestion.pointsPerRinggit,
          pointsRedeemCentsPerPoint: suggestion.pointsRedeemCentsPerPoint,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [levelsRes, settingsRes, rulesRes, menuRes] = await Promise.all([
        merchantApi<{ levels: RewardLevel[] }>(`/api/merchant/${merchantSlug}/reward-levels`),
        merchantApi<ProgramSettings & { languages?: string[]; currency?: "MYR" | "SGD" }>(
          `/api/merchant/${merchantSlug}/settings`,
        ),
        merchantApi<{ rules: PointsRule[] }>(`/api/merchant/${merchantSlug}/points-rules`),
        merchantApi<{ items?: { id: string; name: string }[] }>(
          `/api/merchant/${merchantSlug}/menu`,
        ),
      ]);
      setLevels(normalizeRewardLevels(levelsRes.levels ?? []));
      setSettings({
        pointsPerRinggit: settingsRes.pointsPerRinggit,
        pointsRedeemCentsPerPoint: settingsRes.pointsRedeemCentsPerPoint ?? 10,
      });
      const langs = (settingsRes.languages ?? ["en"]).filter(
        (l): l is ProgramLanguage => l === "en" || l === "zh" || l === "ms",
      );
      setMerchantLanguages(langs.length > 0 ? langs : ["en"]);
      setProgramLang(langs[0] ?? "en");
      setCurrency(settingsRes.currency ?? "MYR");
      setRules(rulesRes.rules);
      setSelectedRuleId((prev) => prev ?? rulesRes.rules[0]?.id ?? null);
      setMenuItems(
        (menuRes.items ?? []).map((i) => ({ id: i.id, name: i.name })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  function updateLevelLocalized(
    levelNumber: number,
    field: "name" | "perkDescription",
    value: string,
  ) {
    setLevels((prev) =>
      prev.map((l) => {
        if (l.levelNumber !== levelNumber) return l;
        if (field === "name") {
          const nameI18n = withLocalized(l.nameI18n, programLang, value);
          return {
            ...l,
            nameI18n,
            name: programLang === "en" ? value : l.name,
          };
        }
        const perkDescriptionI18n = withLocalized(l.perkDescriptionI18n, programLang, value);
        return {
          ...l,
          perkDescriptionI18n,
          perkDescription: programLang === "en" ? value : l.perkDescription,
        };
      }),
    );
    setSaved(false);
  }

  function localizedLevelName(level: RewardLevel) {
    return resolveLocalized(level.nameI18n, programLang, level.name);
  }

  function localizedLevelPerk(level: RewardLevel) {
    return resolveLocalized(level.perkDescriptionI18n, programLang, level.perkDescription ?? "");
  }

  const programCopy = rewardsAdminCopy(programLang);

  function updateLevel(levelNumber: number, patch: Partial<RewardLevel>) {
    setLevels((prev) =>
      prev.map((l) => (l.levelNumber === levelNumber ? { ...l, ...patch } : l)),
    );
    setSaved(false);
  }

  function updateRule(patch: Partial<PointsRule>) {
    if (!selectedRuleId) return;
    setRules((prev) =>
      prev.map((r) => (r.id === selectedRuleId ? { ...r, ...patch } : r)),
    );
    setSaved(false);
  }

  async function saveTiers() {
    setSaving(true);
    setError(null);
    const payload = normalizeRewardLevels(levels);
    try {
      const json = await merchantApi<{ levels: RewardLevel[] }>(
        `/api/merchant/${merchantSlug}/reward-levels`,
        {
          method: "PUT",
          body: JSON.stringify({
            levels: payload.map((l) => ({
              ...l,
              perkDescription: l.perkDescription?.trim() || null,
              nameI18n: l.nameI18n,
              perkDescriptionI18n: l.perkDescriptionI18n,
            })),
          }),
        },
      );
      setLevels(normalizeRewardLevels(json.levels));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          pointsPerRinggit: settings.pointsPerRinggit,
          pointsRedeemCentsPerPoint: settings.pointsRedeemCentsPerPoint,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveRule() {
    if (!selectedRule) return;
    setSaving(true);
    try {
      const json = await merchantApi<{ rule: PointsRule }>(
        `/api/merchant/${merchantSlug}/points-rules`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ruleId: selectedRule.id,
            name: selectedRule.name,
            status: selectedRule.status,
            pointsMultiplier: selectedRule.pointsMultiplier,
            mainConditions: selectedRule.mainConditions,
            itemConditions: selectedRule.itemConditions,
          }),
        },
      );
      setRules((prev) => prev.map((r) => (r.id === json.rule.id ? json.rule : r)));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createRule() {
    setSaving(true);
    try {
      const json = await merchantApi<{ rule: PointsRule }>(
        `/api/merchant/${merchantSlug}/points-rules`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "New points rule",
            status: "inactive",
            pointsMultiplier: 2,
            mainConditions: [],
            itemConditions: [],
          }),
        },
      );
      setRules((prev) => [...prev, json.rule]);
      setSelectedRuleId(json.rule.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    await merchantApi(`/api/merchant/${merchantSlug}/points-rules`, {
      method: "DELETE",
      body: JSON.stringify({ ruleId: id }),
    });
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSelectedRuleId(rules.find((r) => r.id !== id)?.id ?? null);
  }

  const tierOptions = conditionValueOptions("member_tier", levels);
  const valueOptions = conditionValueOptions(
    draftCondition.field,
    levels,
  );

  const saveAction =
    tab === "tiers"
      ? saveTiers
      : tab === "rules"
        ? saveRule
        : tab === "points"
          ? saveSettings
          : undefined;

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="rewards"
      title="iRewards program"
      eyebrow="Loyalty configuration"
      headerAction={
        saveAction ? (
          <button
            type="button"
            onClick={saveAction}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary disabled:opacity-50"
          >
            <Icon name="save" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : undefined
      }
    >
      <div className="mb-6 flex flex-wrap gap-1 border-b border-surface-container-highest">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-mono text-label-mono uppercase ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-3 text-body-md text-red-800" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 p-3 text-body-md text-emerald-800">
          Saved successfully.
        </p>
      )}

      {loading && <p className="text-on-surface-variant">Loading…</p>}

      {!loading && tab === "points" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="space-y-4 border border-surface-container-highest bg-surface-container-lowest p-6">
            <h2 className="font-display text-headline-sm text-primary">Earn & redeem</h2>
            <p className="text-body-md text-on-surface-variant">
              Base earn rate and checkout redemption value before tier multipliers and rules.
            </p>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Points per RM (earn)
              </span>
              <input
                type="number"
                step={0.05}
                min={0.05}
                value={settings.pointsPerRinggit}
                onChange={(e) => {
                  setSettings({ ...settings, pointsPerRinggit: Number(e.target.value) });
                  setSaved(false);
                }}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Redemption (cents / point)
              </span>
              <input
                type="number"
                min={1}
                value={settings.pointsRedeemCentsPerPoint}
                onChange={(e) => {
                  setSettings({
                    ...settings,
                    pointsRedeemCentsPerPoint: Number(e.target.value),
                  });
                  setSaved(false);
                }}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <p className="text-body-md text-on-surface-variant">
              Example: RM 10 order → {Math.floor(10 * settings.pointsPerRinggit)} base pts · 200
              pts = RM {(200 * settings.pointsRedeemCentsPerPoint) / 100} off
            </p>

            {rules.length > 0 && (
              <div className="rounded border border-surface-container bg-surface-container-low p-4">
                <p className="font-display text-eyebrow uppercase text-primary">
                  Active points rules
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Bonus multipliers (e.g. Monday double points) are set under{" "}
                  <button
                    type="button"
                    onClick={() => setTab("rules")}
                    className="text-primary underline"
                  >
                    Points rule
                  </button>
                  , not here.
                </p>
                <ul className="mt-3 space-y-2">
                  {rules.map((rule) => (
                    <li
                      key={rule.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md"
                    >
                      <span className="font-display text-headline-sm text-primary">{rule.name}</span>
                      <span className="text-on-surface-variant">
                        {summarizePointsRule(rule, levels)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {copilot && (
            <PointsCopilotPanel
              suggestion={copilot}
              lang={programLang}
              applying={saving}
              onApply={() => applyCopilot(copilot)}
              onHigherEarn={() => setCopilot(suggestHigherEarn(copilot))}
              onLowerEarn={() => setCopilot(suggestLowerEarn(copilot))}
            />
          )}
        </div>
      )}

      {!loading && tab === "roi" && (
        <PointsRoiPanel
          merchantSlug={merchantSlug}
          currency={currency}
          settings={settings}
          levels={levels}
          rules={rules}
        />
      )}

      {!loading && tab === "tiers" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="font-display text-headline-sm text-primary">Membership tiers</p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Five tiers from Starter to Platinum. Each column is one tier — edit perks
                across the row. Use{" "}
                <span className="font-mono text-label-mono">Edit thresholds &amp; multipliers</span>{" "}
                below to set when members level up.
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Storefront languages are configured in <strong>Settings → Store</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={saveTiers}
              disabled={saving}
              className="border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary disabled:opacity-50"
            >
              Save tiers
            </button>
          </div>

          <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
            <div
              className="grid min-w-[720px]"
              style={{ gridTemplateColumns: `200px repeat(${levels.length}, 1fr)` }}
            >
              <div className="border-b border-r border-surface-container-highest bg-surface-container-low p-3 font-display text-eyebrow uppercase text-on-surface-variant">
                Perk
              </div>
              {levels.map((level) => (
                <div
                  key={level.levelNumber}
                  className="border-b border-r border-surface-container-highest bg-surface-container-low p-3 text-center last:border-r-0"
                >
                  <div
                    className="mx-auto mb-2 h-16 w-full max-w-[120px] rounded shadow-sm"
                    style={{ background: tierCardGradient(level.levelNumber, level.name) }}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Tier {level.levelNumber}
                  </p>
                  <p className="font-display text-headline-sm text-primary">{localizedLevelName(level)}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant line-clamp-2">
                    {localizedLevelPerk(level)}
                  </p>
                </div>
              ))}

              {MATRIX_ROWS.map((row) => (
                <Fragment key={row.key}>
                  <div
                    key={`${row.key}-label`}
                    className="border-b border-r border-surface-container-highest bg-surface-container-low p-3"
                    title={row.hint}
                  >
                    <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant/80">
                      {row.hint}
                    </p>
                  </div>
                  {levels.map((level) => (
                    <div
                      key={`${row.key}-${level.levelNumber}`}
                      className="border-b border-r border-surface-container-highest p-2 text-center text-body-md last:border-r-0"
                    >
                      {row.key === "tierActive" ? (
                        <input
                          type="checkbox"
                          checked={level.tierActive}
                          onChange={(e) =>
                            updateLevel(level.levelNumber, { tierActive: e.target.checked })
                          }
                        />
                      ) : (
                        <input
                          type="number"
                          className="w-full border border-surface-container-highest px-2 py-1 text-center text-body-md"
                          value={level[row.key] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLevel(level.levelNumber, {
                              [row.key]: v === "" ? null : Number(v),
                            } as Partial<RewardLevel>);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          <details className="border border-surface-container-highest bg-surface-container-lowest p-4">
            <summary className="cursor-pointer font-display text-headline-sm text-primary">
              Edit thresholds, multipliers & {programCopy.editingIn.toLowerCase()} copy
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-container-highest">
                    {[
                      programCopy.tierName,
                      programCopy.tierPerk,
                      "Min pts",
                      "Multiplier",
                      "Discount %",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 font-display text-eyebrow uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level) => (
                    <tr key={level.levelNumber} className="border-b border-surface-container">
                      <td className="px-2 py-1">
                        <input
                          value={localizedLevelName(level)}
                          onChange={(e) =>
                            updateLevelLocalized(level.levelNumber, "name", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={localizedLevelPerk(level)}
                          onChange={(e) =>
                            updateLevelLocalized(level.levelNumber, "perkDescription", e.target.value)
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          disabled={level.levelNumber === 1}
                          value={level.minLifetimePoints}
                          onChange={(e) =>
                            updateLevel(level.levelNumber, {
                              minLifetimePoints: Number(e.target.value),
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step={0.05}
                          value={level.pointsMultiplier}
                          onChange={(e) =>
                            updateLevel(level.levelNumber, {
                              pointsMultiplier: Number(e.target.value),
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={level.discountPercent}
                          onChange={(e) =>
                            updateLevel(level.levelNumber, {
                              discountPercent: Number(e.target.value),
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {!loading && tab === "rules" && (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <p className="col-span-full text-body-md text-on-surface-variant lg:col-span-2">
            Schedule bonuses like <strong>Monday double points</strong> here: set a{" "}
            <strong>points multiplier</strong> and add a <strong>day of week</strong> condition.
            Base earn rate stays on the Points tab.
          </p>
          <aside className="border border-surface-container-highest bg-surface-container-lowest p-3">
            <button
              type="button"
              onClick={createRule}
              className="mb-2 flex w-full items-center justify-center gap-1 bg-primary py-2 font-display text-eyebrow uppercase text-on-primary"
            >
              <Icon name="add" />
              New rule
            </button>
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  const json = await merchantApi<{ rule: PointsRule }>(
                    `/api/merchant/${merchantSlug}/points-rules`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        name: "Monday double points",
                        status: "active",
                        pointsMultiplier: 2,
                        mainConditions: [
                          { field: "day_of_week", operator: "is", value: "monday" },
                        ],
                        itemConditions: [],
                      }),
                    },
                  );
                  setRules((prev) => [...prev, json.rule]);
                  setSelectedRuleId(json.rule.id);
                } finally {
                  setSaving(false);
                }
              }}
              className="mb-3 w-full border border-primary py-2 font-mono text-[10px] uppercase text-primary"
            >
              + Monday 2× template
            </button>
            <ul className="space-y-1">
              {rules.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRuleId(r.id)}
                    className={`w-full px-3 py-2 text-left text-body-md ${
                      selectedRuleId === r.id
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    <span
                      className={`block font-display text-headline-sm ${
                        selectedRuleId === r.id ? "text-on-primary" : "text-primary"
                      }`}
                    >
                      {r.name}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        selectedRuleId === r.id ? "text-on-primary/80" : "text-on-surface-variant"
                      }`}
                    >
                      {summarizePointsRule(r, levels)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {selectedRule ? (
            <div className="space-y-6 border border-surface-container-highest bg-surface-container-lowest p-6">
              <div className="border border-primary/30 bg-surface-container-low px-4 py-3">
                <p className="font-display text-eyebrow uppercase text-primary">Rule summary</p>
                <p className="mt-1 font-display text-headline-sm text-primary">
                  {summarizePointsRule(selectedRule, levels)}
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Members earn this multiplier on top of their tier when all conditions match.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset>
                  <legend className="mb-2 font-display text-eyebrow uppercase text-on-surface-variant">
                    Status
                  </legend>
                  {(["active", "inactive"] as const).map((s) => (
                    <label key={s} className="mr-4 inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="rule-status"
                        checked={selectedRule.status === s}
                        onChange={() => updateRule({ status: s })}
                      />
                      <span className="capitalize">{s}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    Name
                  </span>
                  <input
                    value={selectedRule.name}
                    onChange={(e) => updateRule({ name: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              </div>

              <label className="block max-w-xs">
                <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                  Points multiplier
                </span>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  value={selectedRule.pointsMultiplier}
                  onChange={(e) =>
                    updateRule({ pointsMultiplier: Number(e.target.value) })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </label>

              <section>
                <h3 className="mb-3 font-display text-headline-sm text-primary">Main conditions</h3>
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={draftCondition.field}
                    onChange={(e) =>
                      setDraftCondition({
                        ...draftCondition,
                        field: e.target.value as PointsRuleCondition["field"],
                        value: "",
                      })
                    }
                    className={selectClass}
                  >
                    {CONDITION_FIELDS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftCondition.operator}
                    onChange={(e) =>
                      setDraftCondition({
                        ...draftCondition,
                        operator: e.target.value as PointsRuleCondition["operator"],
                      })
                    }
                    className={selectClass}
                  >
                    {CONDITION_OPERATORS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftCondition.value}
                    onChange={(e) =>
                      setDraftCondition({ ...draftCondition, value: e.target.value })
                    }
                    className={`min-w-[140px] ${selectClass}`}
                  >
                    <option value="">Select…</option>
                    {(draftCondition.field === "member_tier" ? tierOptions : valueOptions).map(
                      (o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={!draftCondition.value}
                    onClick={() => {
                      updateRule({
                        mainConditions: [
                          ...selectedRule.mainConditions,
                          { ...draftCondition },
                        ],
                      });
                      setDraftCondition({ field: "member_tier", operator: "is", value: "" });
                    }}
                    className="rounded-full bg-primary px-5 py-2 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
                  >
                    Add rule
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {selectedRule.mainConditions.map((c, i) => (
                    <li
                      key={`${c.field}-${c.value}-${i}`}
                      className="flex items-center justify-between border border-surface-container px-3 py-2 text-body-md"
                    >
                      <span>{formatConditionDisplay(c, levels)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateRule({
                            mainConditions: selectedRule.mainConditions.filter((_, j) => j !== i),
                          })
                        }
                        className="text-on-surface-variant"
                      >
                        <Icon name="close" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-display text-headline-sm text-primary">Item conditions</h3>
                  <span className="text-body-md text-primary">Manage</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={draftItemId}
                    onChange={(e) => setDraftItemId(e.target.value)}
                    className={`min-w-[200px] flex-1 ${selectClass}`}
                  >
                    <option value="">Select menu item…</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!draftItemId}
                    onClick={() => {
                      const item = menuItems.find((m) => m.id === draftItemId);
                      if (!item) return;
                      const next: PointsRuleItemCondition = {
                        menuItemId: item.id,
                        name: item.name,
                      };
                      if (
                        selectedRule.itemConditions.some((i) => i.menuItemId === item.id)
                      ) {
                        return;
                      }
                      updateRule({
                        itemConditions: [...selectedRule.itemConditions, next],
                      });
                      setDraftItemId("");
                    }}
                    className="rounded-full bg-primary px-5 py-2 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-highest">
                      <th className="py-2 text-left font-display text-eyebrow uppercase">Name</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRule.itemConditions.map((item) => (
                      <tr key={item.menuItemId} className="border-b border-surface-container">
                        <td className="py-2 text-body-md">{item.name}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              updateRule({
                                itemConditions: selectedRule.itemConditions.filter(
                                  (i) => i.menuItemId !== item.menuItemId,
                                ),
                              })
                            }
                          >
                            <Icon name="delete" className="text-on-surface-variant" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <button
                type="button"
                onClick={() => deleteRule(selectedRule.id)}
                className="text-body-md text-red-700"
              >
                Delete rule
              </button>
            </div>
          ) : (
            <p className="text-on-surface-variant">Create or select a points rule.</p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
