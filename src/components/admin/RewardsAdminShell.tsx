"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { MembershipSetupWalkthrough } from "@/components/admin/MembershipSetupWalkthrough";
import { AdminShell } from "@/components/admin/AdminShell";
import { BonusDayVoucherCard } from "@/components/admin/BonusDayVoucherCard";
import { LevelGiftsEditor } from "@/components/admin/LevelGiftsEditor";
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
  BONUS_DAY_TEMPLATES,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  DAYS_OF_WEEK,
  bonusDayPlainStory,
  bonusDayTemplatePayload,
  conditionValueOptions,
  formatConditionDisplay,
  getBonusDayId,
  withBonusDay,
  type BonusDayTemplate,
  type PointsRule,
  type PointsRuleCondition,
} from "@/lib/loyalty/points-rules";
import { tierCardGradient } from "@/lib/loyalty/reward-level-map";
import {
  DEFAULT_REWARD_LEVELS,
  normalizeRewardLevels,
  type RewardLevelConfig,
} from "@/lib/loyalty/default-reward-levels";
import { manusHeaderBtnClass, manusHeaderPrimaryBtnClass } from "@/lib/ui/manus";
import {
  joinLevelGifts,
  parseLevelGifts,
} from "@/lib/loyalty/level-gifts";
import {
  MEMBERSHIP_DEFAULT_EARN,
  MEMBERSHIP_DEFAULT_REDEEM,
  MEMBERSHIP_EARN_PRESETS,
  MEMBERSHIP_REDEEM_PRESETS,
  formatEarnCalculation,
  formatSpendCalculation,
  isMembershipEarnPreset,
  isMembershipRedeemPreset,
  pointsForSpend,
} from "@/lib/loyalty/membership-setup";
import { formatDecimal } from "@/lib/format/number";

type RewardLevel = RewardLevelConfig;

type ProgramSettings = {
  pointsPerRinggit: number;
  pointsRedeemCentsPerPoint: number;
};

type MenuItem = { id: string; name: string };

type TabId = "points" | "roi" | "rules" | "tiers";

const TABS: { id: TabId; label: string }[] = [
  { id: "points", label: "Collecting & using" },
  { id: "roi", label: "ROI calculator" },
  { id: "rules", label: "Bonus days" },
  { id: "tiers", label: "Levels & gifts" },
];

const MATRIX_TOP_ROWS: {
  key: "tierActive" | "pointExpiryDays";
  label: string;
  hint: string;
}[] = [
  {
    key: "tierActive",
    label: "Level on",
    hint: "Turn off to hide this level from diners",
  },
  {
    key: "pointExpiryDays",
    label: "Points expire",
    hint: "Industry typical: 365 days. Blank = never",
  },
];

const MATRIX_MORE_ROWS: {
  key: keyof Pick<
    RewardLevel,
    | "birthdayPoints"
    | "welcomeRewards"
    | "welcomePoints"
    | "renewRewards"
    | "renewPoints"
    | "validityMonths"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "birthdayPoints",
    label: "Birthday bonus",
    hint: "Extra points on the member's birthday",
  },
  {
    key: "welcomeRewards",
    label: "Welcome freebies",
    hint: "Free vouchers when they first reach this level",
  },
  {
    key: "welcomePoints",
    label: "Welcome bonus",
    hint: "Bonus points when they first reach this level",
  },
  {
    key: "renewRewards",
    label: "Renewal freebies",
    hint: "Free vouchers when this level renews",
  },
  {
    key: "renewPoints",
    label: "Renewal bonus",
    hint: "Bonus points when this level renews",
  },
  {
    key: "validityMonths",
    label: "Level lasts",
    hint: "Months before the level renews (blank = forever)",
  },
];

const matrixCellInputClass =
  "w-full border-0 border-b border-surface-container-highest bg-transparent py-1.5 text-center font-display text-headline-sm text-primary outline-none focus:border-primary disabled:opacity-50";

const matrixLabelCellClass =
  "border-b border-r border-surface-container-highest bg-surface-container-low px-3 py-3";

const matrixValueCellClass =
  "border-b border-r border-surface-container-highest px-3 py-3 text-center last:border-r-0";

/** Muted look when Level on = Off — grey card + faded column. */
function levelOffColumnClass(tierActive: boolean): string {
  return tierActive ? "" : "bg-surface-container-high/40 text-on-surface-variant opacity-60 grayscale";
}

const inputClass =
  "w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md outline-none focus:border-primary";

const selectClass =
  "border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md outline-none focus:border-primary";

type RewardsAdminShellProps = {
  merchantSlug: string;
  forceSetup?: boolean;
  onBackToHub?: () => void;
};

export function RewardsAdminShell({
  merchantSlug,
  forceSetup = false,
  onBackToHub,
}: RewardsAdminShellProps) {
  const [tab, setTab] = useState<TabId>("tiers");
  const [levels, setLevels] = useState<RewardLevel[]>(() => [...DEFAULT_REWARD_LEVELS]);
  const [settings, setSettings] = useState<ProgramSettings>({
    pointsPerRinggit: MEMBERSHIP_DEFAULT_EARN.pointsPerRinggit,
    pointsRedeemCentsPerPoint: MEMBERSHIP_DEFAULT_REDEEM.centsPerPoint,
  });
  const [rules, setRules] = useState<PointsRule[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [draftCondition, setDraftCondition] = useState<PointsRuleCondition>({
    field: "day_of_week",
    operator: "is",
    value: "",
  });
  const [draftItemId, setDraftItemId] = useState("");
  const [showBonusTemplates, setShowBonusTemplates] = useState(false);
  const [draftRule, setDraftRule] = useState<PointsRule | null>(null);
  const [programLang, setProgramLang] = useState<ProgramLanguage>("en");
  const [, setMerchantLanguages] = useState<ProgramLanguage[]>(["en"]);
  const [currency, setCurrency] = useState<"MYR" | "SGD">("MYR");
  const [cafeName, setCafeName] = useState("your cafe");
  const [showWalkthrough, setShowWalkthrough] = useState(forceSetup);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;
  const editingRule = draftRule ?? selectedRule;
  const isDraft = draftRule !== null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [levelsRes, settingsRes, rulesRes, menuRes] = await Promise.all([
        merchantApi<{ levels: RewardLevel[] }>(`/api/merchant/${merchantSlug}/reward-levels`),
        merchantApi<
          ProgramSettings & {
            languages?: string[];
            currency?: "MYR" | "SGD";
            name?: string;
            membershipSetupCompleted?: boolean;
          }
        >(`/api/merchant/${merchantSlug}/settings`),
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
      setCafeName(settingsRes.name?.trim() || "your cafe");
      const completed = Boolean(settingsRes.membershipSetupCompleted);
      const dismissed =
        typeof window !== "undefined" &&
        window.localStorage.getItem(`irewards-membership-setup-dismissed-${merchantSlug}`) ===
          "1";
      setShowWalkthrough(
        forceSetup || (!completed && !dismissed && merchantSlug !== "demo-cafe"),
      );
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
  }, [merchantSlug, forceSetup]);

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
    if (draftRule) {
      setDraftRule({ ...draftRule, ...patch });
      setSaved(false);
      return;
    }
    if (!selectedRuleId) return;
    setRules((prev) =>
      prev.map((r) => (r.id === selectedRuleId ? { ...r, ...patch } : r)),
    );
    setSaved(false);
  }

  function startBlankDraft() {
    setSelectedRuleId(null);
    setDraftRule({
      id: "__draft__",
      name: "",
      status: "inactive",
      pointsMultiplier: 2,
      mainConditions: [],
      itemConditions: [],
      sortOrder: 0,
    });
    setSaved(false);
    setError(null);
  }

  async function finishMembershipSetup() {
    setSaving(true);
    setError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          pointsPerRinggit: settings.pointsPerRinggit,
          pointsRedeemCentsPerPoint: settings.pointsRedeemCentsPerPoint,
          membershipSetupCompleted: true,
        }),
      });
      const payload = normalizeRewardLevels(levels);
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
      setShowWalkthrough(false);
      setSaved(true);
      window.localStorage.removeItem(`irewards-membership-setup-dismissed-${merchantSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save membership setup");
    } finally {
      setSaving(false);
    }
  }

  function skipMembershipSetup() {
    window.localStorage.setItem(`irewards-membership-setup-dismissed-${merchantSlug}`, "1");
    setShowWalkthrough(false);
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

  async function saveRule() {
    if (!editingRule) return;
    if (!getBonusDayId(editingRule)) {
      setError("Pick which day this bonus applies to.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isDraft) {
        const json = await merchantApi<{ rule: PointsRule }>(
          `/api/merchant/${merchantSlug}/points-rules`,
          {
            method: "POST",
            body: JSON.stringify({
              name: editingRule.name.trim() || "Bonus day",
              status: editingRule.status,
              pointsMultiplier: editingRule.pointsMultiplier,
              mainConditions: editingRule.mainConditions,
              itemConditions: editingRule.itemConditions,
            }),
          },
        );
        setRules((prev) => [...prev, json.rule]);
        setDraftRule(null);
        setSelectedRuleId(json.rule.id);
        setSaved(true);
        return;
      }
      const json = await merchantApi<{ rule: PointsRule }>(
        `/api/merchant/${merchantSlug}/points-rules`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ruleId: editingRule.id,
            name: editingRule.name,
            status: editingRule.status,
            pointsMultiplier: editingRule.pointsMultiplier,
            mainConditions: editingRule.mainConditions,
            itemConditions: editingRule.itemConditions,
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

  async function discardOrDeleteRule() {
    if (isDraft) {
      setDraftRule(null);
      setSelectedRuleId(rules[0]?.id ?? null);
      setError(null);
      return;
    }
    if (!editingRule) return;
    await deleteRule(editingRule.id);
  }

  async function createFromTemplate(template: BonusDayTemplate) {
    setSaving(true);
    setError(null);
    try {
      const json = await merchantApi<{ rule: PointsRule }>(
        `/api/merchant/${merchantSlug}/points-rules`,
        {
          method: "POST",
          body: JSON.stringify(bonusDayTemplatePayload(template)),
        },
      );
      setRules((prev) => [...prev, json.rule]);
      setSelectedRuleId(json.rule.id);
      setDraftRule(null);
      setShowBonusTemplates(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create bonus from template");
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

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="rewards"
      title="iRewards program"
      eyebrow="Loyalty configuration · Points"
      headerAction={
        onBackToHub ? (
          <button type="button" onClick={onBackToHub} className={manusHeaderBtnClass}>
            <Icon name="arrow_back" className="text-[16px]" />
            Hub
          </button>
        ) : undefined
      }
    >
      {showWalkthrough && !loading ? (
        <MembershipSetupWalkthrough
          cafeName={cafeName}
          merchantSlug={merchantSlug}
          currency={currency}
          saving={saving}
          levels={levels}
          pointsPerRinggit={settings.pointsPerRinggit}
          centsPerPoint={settings.pointsRedeemCentsPerPoint}
          onLevelsChange={(next) => {
            setLevels(next);
            setSaved(false);
          }}
          onRatesChange={(next) => {
            setSettings({
              pointsPerRinggit: next.pointsPerRinggit,
              pointsRedeemCentsPerPoint: next.centsPerPoint,
            });
            setSaved(false);
          }}
          onComplete={() => void finishMembershipSetup()}
          onSkip={skipMembershipSetup}
        />
      ) : (
        <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-highest">
        <div className="flex flex-wrap gap-1">
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
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(
              `irewards-membership-setup-dismissed-${merchantSlug}`,
            );
            setShowWalkthrough(true);
          }}
          className="mb-1 inline-flex shrink-0 items-center gap-2 border border-[#1a3d2e] px-3 py-2 font-display text-headline-sm text-[#1a3d2e]"
        >
          <Icon name="smart_toy" className="text-[18px]" />
          iRewards Setup Wizard
        </button>
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
        <div className="space-y-6">
          <section className="space-y-6 border border-surface-container-highest bg-surface-container-lowest p-6">
            <div>
              <h2 className="font-display text-headline-sm text-primary">
                Collecting &amp; using points
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Shows what you set in the <strong>iRewards guide</strong>. Change collecting or
                redeem rates there — this tab only displays the live program.
              </p>
            </div>

            {(() => {
              const symbol = currency === "SGD" ? "S$" : "RM";
              const unitPlural = currency === "SGD" ? "cents" : "sen";
              const spendExample = 10;
              const starterPts = pointsForSpend(
                spendExample,
                settings.pointsPerRinggit,
                1,
              );
              const earnPreset = MEMBERSHIP_EARN_PRESETS.find(
                (p) => Math.abs(p.pointsPerRinggit - settings.pointsPerRinggit) < 0.0005,
              );
              const redeemPreset = MEMBERSHIP_REDEEM_PRESETS.find(
                (p) => p.centsPerPoint === settings.pointsRedeemCentsPerPoint,
              );
              const earnCalc = formatEarnCalculation(
                symbol,
                spendExample,
                settings.pointsPerRinggit,
                1,
              );
              const spendCalc = formatSpendCalculation(
                symbol,
                starterPts || 1,
                settings.pointsRedeemCentsPerPoint,
                unitPlural,
              );
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border border-primary bg-surface-container-low p-4">
                      <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                        Collecting — points per {symbol} 1 spent
                      </p>
                      <p className="mt-2 font-display text-headline-md text-primary">
                        {formatDecimal(settings.pointsPerRinggit)}{" "}
                        <span className="text-body-md">pts / {symbol}</span>
                      </p>
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        {earnPreset
                          ? earnPreset.label
                          : isMembershipEarnPreset(settings.pointsPerRinggit)
                            ? "Preset"
                            : "Custom (from iRewards guide)"}
                        {earnPreset ? ` · ${earnPreset.hint}` : null}
                      </p>
                      <p className="mt-3 font-mono text-[11px] leading-snug text-primary">
                        {earnCalc}
                      </p>
                      <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                        → {starterPts} pt{starterPts === 1 ? "" : "s"} on {symbol} {spendExample}
                      </p>
                    </div>
                    <div className="border border-primary bg-surface-container-low p-4">
                      <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                        Using — {unitPlural} per point
                      </p>
                      <p className="mt-2 font-display text-headline-md text-primary">
                        {settings.pointsRedeemCentsPerPoint} {unitPlural} / pt
                      </p>
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        {redeemPreset
                          ? redeemPreset.hint
                          : isMembershipRedeemPreset(settings.pointsRedeemCentsPerPoint)
                            ? "Preset"
                            : "Custom (from iRewards guide)"}
                      </p>
                      <p className="mt-3 font-mono text-[11px] leading-snug text-primary">
                        {spendCalc}
                      </p>
                    </div>
                  </div>

                  <p className="text-body-md text-on-surface-variant">
                    Example: {symbol} {spendExample} bill → {starterPts} pts collected · 100 pts ={" "}
                    {symbol}{" "}
                    {((100 * settings.pointsRedeemCentsPerPoint) / 100).toFixed(2)} off
                  </p>
                </>
              );
            })()}

            {rules.length > 0 && (
              <div className="rounded border border-surface-container bg-surface-container-low p-4">
                <p className="font-display text-eyebrow uppercase text-primary">
                  Active bonus days
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Extra multipliers (e.g. Monday double points) are set under{" "}
                  <button
                    type="button"
                    onClick={() => setTab("rules")}
                    className="text-primary underline"
                  >
                    Bonus days
                  </button>
                  , not here.
                </p>
                <ul className="mt-3 space-y-2">
                  {rules.map((rule) => (
                    <li key={rule.id}>
                      <BonusDayVoucherCard
                        name={rule.name}
                        story={bonusDayPlainStory(rule)}
                        multiplier={rule.pointsMultiplier}
                        status={rule.status === "active" ? "active" : "inactive"}
                        onClick={() => setTab("rules")}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
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
              <p className="font-display text-headline-sm text-primary">Levels &amp; gifts</p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Set each level’s unlock points, collecting speed, and gifts. Money off at checkout
                comes from redeeming points. Editing in {programCopy.editingIn.toLowerCase()}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveTiers()}
              disabled={saving}
              className={manusHeaderPrimaryBtnClass}
            >
              <Icon name="save" className="text-[16px]" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="overflow-x-auto border border-surface-container-highest bg-surface-container-lowest">
            <div
              className="grid min-w-[960px]"
              style={{ gridTemplateColumns: `180px repeat(${levels.length}, minmax(150px, 1fr))` }}
            >
              {/* Level cards */}
              <div className={`${matrixLabelCellClass} font-display text-eyebrow uppercase text-on-surface-variant`}>
                Level
              </div>
              {levels.map((level) => (
                <div
                  key={level.levelNumber}
                  className={`${matrixValueCellClass} bg-surface-container-low ${levelOffColumnClass(level.tierActive)}`}
                >
                  <div
                    className="mx-auto mb-2 h-14 w-full max-w-[100px] rounded-sm shadow-sm"
                    style={{
                      background: level.tierActive
                        ? tierCardGradient(level.levelNumber, level.name)
                        : "linear-gradient(145deg, #b0b0b0 0%, #8a8a8a 55%, #6e6e6e 100%)",
                    }}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Level {level.levelNumber}
                  </p>
                  <input
                    value={localizedLevelName(level)}
                    onChange={(e) =>
                      updateLevelLocalized(level.levelNumber, "name", e.target.value)
                    }
                    className={`mt-1 w-full border-0 border-b border-surface-container-highest bg-transparent py-1 text-center font-display text-headline-sm focus:border-primary focus:outline-none ${
                      level.tierActive ? "text-primary" : "text-on-surface-variant"
                    }`}
                    aria-label={`${localizedLevelName(level)} name`}
                  />
                </div>
              ))}

              {/* Level on + Points expire — right under cards */}
              {MATRIX_TOP_ROWS.map((row) => (
                <Fragment key={row.key}>
                  <div className={matrixLabelCellClass} title={row.hint}>
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
                      className={`${matrixValueCellClass} ${
                        row.key === "tierActive" ? "" : levelOffColumnClass(level.tierActive)
                      }`}
                    >
                      {row.key === "tierActive" ? (
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={level.tierActive}
                            onChange={(e) =>
                              updateLevel(level.levelNumber, { tierActive: e.target.checked })
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span
                            className={`font-mono text-[10px] uppercase ${
                              level.tierActive ? "text-primary" : "text-on-surface-variant"
                            }`}
                          >
                            {level.tierActive ? "On" : "Off"}
                          </span>
                        </label>
                      ) : (
                        <div>
                          <input
                            type="number"
                            min={0}
                            className={matrixCellInputClass}
                            value={level.pointExpiryDays ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateLevel(level.levelNumber, {
                                pointExpiryDays: v === "" ? null : Number(v),
                              });
                            }}
                          />
                          <p className="mt-1 font-mono text-[10px] uppercase text-on-surface-variant">
                            days
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </Fragment>
              ))}

              {/* Unlock */}
              <div className={matrixLabelCellClass}>
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                  Unlock after
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant/80">
                  Lifetime points to reach this level
                </p>
              </div>
              {levels.map((level) => (
                <div
                  key={`unlock-${level.levelNumber}`}
                  className={`${matrixValueCellClass} ${levelOffColumnClass(level.tierActive)}`}
                >
                  <input
                    type="number"
                    disabled={level.levelNumber === 1}
                    min={0}
                    value={level.minLifetimePoints}
                    onChange={(e) =>
                      updateLevel(level.levelNumber, {
                        minLifetimePoints: Number(e.target.value),
                      })
                    }
                    className={matrixCellInputClass}
                  />
                  <p className="mt-1 font-mono text-[10px] uppercase text-on-surface-variant">
                    pts lifetime
                  </p>
                </div>
              ))}

              {/* Collecting speed */}
              <div className={matrixLabelCellClass}>
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                  Collecting speed
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant/80">
                  How fast this level earns vs Starter
                </p>
              </div>
              {levels.map((level) => (
                <div
                  key={`mult-${level.levelNumber}`}
                  className={`${matrixValueCellClass} ${levelOffColumnClass(level.tierActive)}`}
                >
                  <input
                    type="number"
                    min={1}
                    step={0.05}
                    value={level.pointsMultiplier}
                    onChange={(e) =>
                      updateLevel(level.levelNumber, {
                        pointsMultiplier: Number(e.target.value),
                      })
                    }
                    className={matrixCellInputClass}
                  />
                  <p className="mt-1 font-mono text-[10px] uppercase text-on-surface-variant">
                    × points
                  </p>
                </div>
              ))}

              {/* Gifts — click opens popup */}
              <div className={matrixLabelCellClass}>
                <p className="font-display text-eyebrow uppercase text-on-surface-variant">Gifts</p>
                <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant/80">
                  Click a cell — edit in a popup
                </p>
              </div>
              {levels.map((level) => (
                <div
                  key={`gifts-${level.levelNumber}`}
                  className={`border-b border-r border-surface-container-highest px-3 py-3 text-left last:border-r-0 ${levelOffColumnClass(level.tierActive)}`}
                >
                  <LevelGiftsEditor
                    key={`${level.levelNumber}-${programLang}`}
                    gifts={parseLevelGifts(localizedLevelPerk(level))}
                    hideLabel
                    compact
                    levelLabel={localizedLevelName(level)}
                    onChange={(gifts) =>
                      updateLevelLocalized(
                        level.levelNumber,
                        "perkDescription",
                        joinLevelGifts(gifts),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <details className="group border-t-2 border-[#1a3d2e]/30 bg-[#1a3d2e]/[0.04]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#1a3d2e] text-white">
                  <Icon
                    name="card_giftcard"
                    className="text-[20px] transition-transform group-open:scale-110"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-headline-sm text-[#1a3d2e]">
                      More bonuses
                    </span>
                    <span className="bg-[#1a3d2e] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
                      Often missed
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-on-surface">
                    Birthday points · Welcome gift · Renewal bonus — tap to set per level
                  </span>
                </span>
                <Icon
                  name="expand_more"
                  className="shrink-0 text-[22px] text-[#1a3d2e] transition-transform group-open:rotate-180"
                />
              </summary>
              <div
                className="grid min-w-[960px] border-t border-[#1a3d2e]/20 bg-white"
                style={{ gridTemplateColumns: `180px repeat(${levels.length}, minmax(150px, 1fr))` }}
              >
                {MATRIX_MORE_ROWS.map((row) => (
                  <Fragment key={row.key}>
                    <div className={matrixLabelCellClass} title={row.hint}>
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
                        className={`${matrixValueCellClass} ${levelOffColumnClass(level.tierActive)}`}
                      >
                        <input
                          type="number"
                          className={matrixCellInputClass}
                          value={level[row.key] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLevel(level.levelNumber, {
                              [row.key]: v === "" ? null : Number(v),
                            } as Partial<RewardLevel>);
                          }}
                        />
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {!loading && tab === "rules" && (
        <div className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-headline-sm text-[#1a3d2e]">
              Extra points on quiet days
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Want more visits on a slow weekday? Turn on a bonus day — e.g.{" "}
              <strong>Mondays = double points</strong>. Everyday rates stay under{" "}
              <button
                type="button"
                onClick={() => setTab("points")}
                className="text-primary underline"
              >
                Collecting &amp; using
              </button>
              .
            </p>
          </div>

          {rules.length === 0 && !draftRule ? (
            <div className="relative max-w-xl overflow-hidden border border-[#1a3d2e]/25 bg-white">
              <div className="flex">
                <div className="flex w-[88px] shrink-0 flex-col items-center justify-center bg-[#1a3d2e] py-8 text-white">
                  <span className="font-display text-[28px] leading-none">2×</span>
                  <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] opacity-80">
                    points
                  </span>
                </div>
                <div className="relative w-0 shrink-0 self-stretch">
                  <div className="absolute inset-y-0 left-0 border-l border-dashed border-[#1a3d2e]/35" />
                  <span aria-hidden className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-surface" />
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full bg-surface"
                  />
                </div>
                <div className="flex-1 p-5 md:p-6">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Sample voucher
                  </p>
                  <p className="mt-1 font-display text-headline-sm text-[#1a3d2e]">
                    Most cafes start here
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-on-surface">
                    Pick a ready-made bonus day (Monday double, weekend boost, and more), or make
                    your own. You can edit or turn it off later.
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowBonusTemplates(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-[#1a3d2e] px-5 py-2.5 font-display text-headline-sm text-white disabled:opacity-50"
                  >
                    <Icon name="auto_awesome" className="text-[18px]" />
                    Choose from template
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={startBlankDraft}
                    className="mt-3 block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant underline disabled:opacity-50"
                  >
                    Or make my own bonus day
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
              <aside className="space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Your bonus days
                </p>
                {rules.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant">
                    Nothing saved yet — fill in the form on the right, then Save changes.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {rules.map((r) => (
                      <li key={r.id}>
                        <BonusDayVoucherCard
                          name={r.name}
                          story={bonusDayPlainStory(r)}
                          multiplier={r.pointsMultiplier}
                          status={r.status === "active" ? "active" : "inactive"}
                          selected={!isDraft && selectedRuleId === r.id}
                          onClick={() => {
                            setDraftRule(null);
                            setSelectedRuleId(r.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {isDraft ? (
                  <div className="border border-dashed border-[#1a3d2e]/40 bg-[#1a3d2e]/5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e]">
                    New bonus (not saved)
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowBonusTemplates(true)}
                    className="flex w-full items-center justify-center gap-1 border border-[#1a3d2e] py-2 font-mono text-[11px] uppercase tracking-wider text-[#1a3d2e] disabled:opacity-50"
                  >
                    <Icon name="auto_awesome" className="text-[14px]" />
                    Choose from template
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={startBlankDraft}
                    className="flex w-full items-center justify-center gap-1 border border-surface-container-highest py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant disabled:opacity-50"
                  >
                    <Icon name="add" className="text-[14px]" />
                    Make my own
                  </button>
                </div>
              </aside>

              {editingRule ? (
                <div className="space-y-5 border border-surface-container-highest bg-white p-5 md:p-6">
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                      Voucher preview
                    </p>
                    <BonusDayVoucherCard
                      name={editingRule.name.trim() || "New bonus day"}
                      story={bonusDayPlainStory({
                        ...editingRule,
                        name: editingRule.name.trim() || "New bonus day",
                      })}
                      multiplier={editingRule.pointsMultiplier}
                      status={editingRule.status === "active" ? "active" : "inactive"}
                      size="md"
                    />
                    <p className="text-[13px] text-on-surface-variant">
                      Uses the higher of this bonus and the member&apos;s level speed — not both.
                      Day is based on your cafe timezone (
                      {currency === "SGD" ? "Singapore" : "Malaysia"}).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-3">
                      <span className="font-display text-headline-sm text-[#1a3d2e]">
                        Give this bonus to members
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={editingRule.status === "active"}
                        onClick={() =>
                          updateRule({
                            status: editingRule.status === "active" ? "inactive" : "active",
                          })
                        }
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          editingRule.status === "active" ? "bg-[#1a3d2e]" : "bg-surface-container-highest"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                            editingRule.status === "active" ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </label>
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      {editingRule.status === "active" ? "On now" : "Paused"}
                    </span>
                  </div>

                  <label className="block max-w-md">
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Name (for you)
                    </span>
                    <input
                      value={editingRule.name}
                      onChange={(e) => updateRule({ name: e.target.value })}
                      className={`mt-1 ${inputClass}`}
                      placeholder="e.g. Monday double points"
                    />
                  </label>

                  <div>
                    <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Which day?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((d) => {
                        const active = getBonusDayId(editingRule) === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() =>
                              updateRule({
                                mainConditions: withBonusDay(editingRule, d.id),
                                name:
                                  !editingRule.name.trim() ||
                                  editingRule.name === "Bonus day" ||
                                  editingRule.name === "New points rule" ||
                                  editingRule.name === "New bonus day"
                                    ? `${d.label} double points`
                                    : editingRule.name,
                              })
                            }
                            className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                              active
                                ? "bg-[#1a3d2e] text-white"
                                : "border border-surface-container-highest text-on-surface-variant"
                            }`}
                          >
                            {d.label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                      How much extra?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { mult: 1.5, label: "1.5× · a bit more" },
                        { mult: 2, label: "2× · double" },
                        { mult: 3, label: "3× · triple" },
                      ].map((opt) => {
                        const active = Math.abs(editingRule.pointsMultiplier - opt.mult) < 0.001;
                        return (
                          <button
                            key={opt.mult}
                            type="button"
                            onClick={() => updateRule({ pointsMultiplier: opt.mult })}
                            className={`px-3 py-1.5 text-[13px] ${
                              active
                                ? "bg-[#1a3d2e] text-white"
                                : "border border-surface-container-highest text-on-surface"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-3 block max-w-[140px]">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        Or type ×
                      </span>
                      <input
                        type="number"
                        step={0.1}
                        min={1}
                        max={10}
                        value={editingRule.pointsMultiplier}
                        onChange={(e) =>
                          updateRule({ pointsMultiplier: Number(e.target.value) })
                        }
                        className={`mt-1 ${inputClass}`}
                      />
                    </label>
                  </div>

                  <details className="border border-surface-container-highest p-4">
                    <summary className="cursor-pointer font-display text-headline-sm text-[#1a3d2e]">
                      Optional: only for some levels or menu items
                    </summary>
                    <div className="mt-4 space-y-4">
                      <section>
                        <h3 className="mb-2 text-[13px] text-on-surface-variant">
                          Extra conditions (leave empty = whole day)
                        </h3>
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
                            {(draftCondition.field === "member_tier"
                              ? tierOptions
                              : valueOptions
                            ).map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!draftCondition.value}
                            onClick={() => {
                              updateRule({
                                mainConditions: [
                                  ...editingRule.mainConditions,
                                  { ...draftCondition },
                                ],
                              });
                              setDraftCondition({
                                field: "day_of_week",
                                operator: "is",
                                value: "",
                              });
                            }}
                            className="bg-[#1a3d2e] px-4 py-2 font-mono text-[11px] uppercase text-white disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {editingRule.mainConditions.map((c, i) => (
                            <li
                              key={`${c.field}-${c.value}-${i}`}
                              className="flex items-center justify-between border border-surface-container px-3 py-2 text-body-md"
                            >
                              <span>{formatConditionDisplay(c, levels)}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRule({
                                    mainConditions: editingRule.mainConditions.filter(
                                      (_, j) => j !== i,
                                    ),
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
                        <h3 className="mb-2 text-[13px] text-on-surface-variant">
                          Only when the order includes…
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={draftItemId}
                            onChange={(e) => setDraftItemId(e.target.value)}
                            className={`min-w-[200px] flex-1 ${selectClass}`}
                          >
                            <option value="">Any menu item</option>
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
                              if (
                                editingRule.itemConditions.some((i) => i.menuItemId === item.id)
                              ) {
                                return;
                              }
                              updateRule({
                                itemConditions: [
                                  ...editingRule.itemConditions,
                                  { menuItemId: item.id, name: item.name },
                                ],
                              });
                              setDraftItemId("");
                            }}
                            className="bg-[#1a3d2e] px-4 py-2 font-mono text-[11px] uppercase text-white disabled:opacity-50"
                          >
                            Add item
                          </button>
                        </div>
                        {editingRule.itemConditions.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {editingRule.itemConditions.map((item) => (
                              <li
                                key={item.menuItemId}
                                className="flex items-center justify-between text-body-md"
                              >
                                <span>{item.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRule({
                                      itemConditions: editingRule.itemConditions.filter(
                                        (i) => i.menuItemId !== item.menuItemId,
                                      ),
                                    })
                                  }
                                >
                                  <Icon name="delete" className="text-on-surface-variant" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>
                  </details>

                  <div className="flex flex-nowrap items-center gap-3 border-t border-surface-container-highest pt-4">
                    <button
                      type="button"
                      onClick={() => void saveRule()}
                      disabled={saving}
                      className={manusHeaderPrimaryBtnClass}
                    >
                      <Icon name="save" className="text-[16px]" />
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void discardOrDeleteRule()}
                      disabled={saving}
                      className="ml-auto text-body-md text-red-700 disabled:opacity-50"
                    >
                      {isDraft ? "Discard" : "Delete this bonus"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant">Pick a bonus day on the left to edit it.</p>
              )}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {showBonusTemplates ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bonus-templates-title"
          onClick={() => setShowBonusTemplates(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto border border-surface-container-highest bg-surface-container-lowest p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="bonus-templates-title"
                  className="font-display text-headline-sm text-primary"
                >
                  Choose a bonus day
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Pick one to turn on now — you can edit or turn it off later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBonusTemplates(false)}
                className="text-on-surface-variant"
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {BONUS_DAY_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void createFromTemplate(t)}
                    className="flex w-full flex-col items-start gap-0.5 border border-surface-container-highest px-4 py-3 text-left transition hover:border-[#1a3d2e] hover:bg-surface-container-low disabled:opacity-50"
                  >
                    <span className="font-display text-body-md text-primary">{t.name}</span>
                    <span className="text-[13px] text-on-surface-variant">{t.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowBonusTemplates(false);
                startBlankDraft();
              }}
              className="mt-4 w-full border border-dashed border-surface-container-highest py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant disabled:opacity-50"
            >
              Or make my own
            </button>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
