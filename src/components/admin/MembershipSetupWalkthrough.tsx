"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatDecimal } from "@/lib/format/number";
import type { RewardLevelConfig } from "@/lib/loyalty/default-reward-levels";
import {
  EARN_BACK_GAUGE_MAX_PERCENT,
  earnBackVerdict,
  type EarnBackVerdictTone,
} from "@/lib/loyalty/industry-benchmarks";
import {
  MEMBERSHIP_DEFAULT_EARN,
  MEMBERSHIP_DEFAULT_REDEEM,
  MEMBERSHIP_EARN_PRESETS,
  MEMBERSHIP_LEVEL_COUNT_OPTIONS,
  MEMBERSHIP_REDEEM_PRESETS,
  activeMembershipLevels,
  applyMembershipLevelCount,
  formatEarnCalculation,
  formatSpendCalculation,
  membershipEarnBackPercent,
  membershipLevelCount,
  moneyForPoints,
  pointsForSpend,
  topActiveMembershipLevel,
} from "@/lib/loyalty/membership-setup";
import { joinLevelGifts, parseLevelGifts } from "@/lib/loyalty/level-gifts";
import { LevelGiftsEditor } from "@/components/admin/LevelGiftsEditor";
import { PointsRoiPanel } from "@/components/admin/PointsRoiPanel";
import type { MerchantCurrency } from "@/lib/merchant/currency";
import { manusDotGridClass, manusLabelClass, manusPrimaryButtonClass } from "@/lib/ui/manus";

type MembershipSetupWalkthroughProps = {
  cafeName: string;
  merchantSlug: string;
  currency: MerchantCurrency;
  saving: boolean;
  levels: RewardLevelConfig[];
  pointsPerRinggit: number;
  centsPerPoint: number;
  onLevelsChange: (levels: RewardLevelConfig[]) => void;
  onRatesChange: (next: { pointsPerRinggit: number; centsPerPoint: number }) => void;
  onComplete: () => void;
  onSkip: () => void;
};

const STEPS = [
  { id: "welcome", label: "What is this?" },
  { id: "tiers", label: "How many levels" },
  { id: "earn", label: "Collecting" },
  { id: "redeem", label: "Using points" },
  { id: "perks", label: "Levels & gifts" },
  { id: "roi", label: "ROI" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

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

function AgentLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3d2e] text-white">
        <Icon name="smart_toy" className="text-lg" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          iRewards guide
        </p>
        <div className="text-body-md leading-relaxed text-on-surface">{children}</div>
      </div>
    </div>
  );
}

function ScenarioBox({
  title,
  steps,
}: {
  title: string;
  steps: { label: string; detail: string }[];
}) {
  return (
    <div className="border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 p-4">
      <p className={manusLabelClass}>{title}</p>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a3d2e] font-mono text-[11px] text-white">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-headline-sm text-[#1a3d2e]">{s.label}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TwoColumnCompare({
  left,
  right,
}: {
  left: { title: string; body: string };
  right: { title: string; body: string };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="border border-surface-container-highest bg-white p-4">
        <p className={manusLabelClass}>{left.title}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-on-surface">{left.body}</p>
      </div>
      <div className="border border-surface-container-highest bg-white p-4">
        <p className={manusLabelClass}>{right.title}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-on-surface">{right.body}</p>
      </div>
    </div>
  );
}

const VERDICT_TONE_STYLES: Record<
  EarnBackVerdictTone,
  { border: string; bg: string; badge: string; marker: string }
> = {
  tight: {
    border: "border-amber-700/25",
    bg: "bg-amber-50",
    badge: "bg-amber-800 text-white",
    marker: "bg-amber-800",
  },
  healthy: {
    border: "border-[#1a3d2e]/25",
    bg: "bg-[#1a3d2e]/5",
    badge: "bg-[#1a3d2e] text-white",
    marker: "bg-[#1a3d2e]",
  },
  generous: {
    border: "border-amber-700/30",
    bg: "bg-amber-50",
    badge: "bg-amber-800 text-white",
    marker: "bg-amber-800",
  },
  too_high: {
    border: "border-red-800/25",
    bg: "bg-red-50",
    badge: "bg-red-800 text-white",
    marker: "bg-red-800",
  },
};

function VerdictGauge({
  earnBack,
  currency,
  symbol,
  spendExample,
  rewardMoney,
  customerName,
}: {
  earnBack: number;
  currency: MerchantCurrency;
  symbol: string;
  spendExample: number;
  rewardMoney: number;
  customerName: string;
}) {
  const verdict = earnBackVerdict(earnBack, currency);
  const styles = VERDICT_TONE_STYLES[verdict.tone];
  const healthyStart = (verdict.industryMin / EARN_BACK_GAUGE_MAX_PERCENT) * 100;
  const healthyEnd = (verdict.industryMax / EARN_BACK_GAUGE_MAX_PERCENT) * 100;

  return (
    <div className={`border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={manusLabelClass}>Verdict · vs {verdict.countryLabel} cafes</p>
          <p className="mt-1 font-display text-headline-md text-[#1a3d2e]">{verdict.label}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${styles.badge}`}
        >
          You · {formatDecimal(earnBack)}%
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-on-surface">
        Out of every {symbol} {spendExample} {customerName} spends, about {symbol}{" "}
        {rewardMoney.toFixed(2)} can come back as a discount someday — that is{" "}
        {formatDecimal(earnBack)}% “comes back as rewards”. Most cafes in {verdict.countryLabel}{" "}
        stay near {verdict.industryTypical}%.
      </p>

      <div className="relative mt-6 pt-5">
        <div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${verdict.youMarkerPct}%` }}
        >
          <span className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white ${styles.marker}`}>
            You
          </span>
        </div>

        <div className="relative h-3 overflow-hidden rounded-sm bg-white/80">
          <div
            className="absolute inset-y-0 bg-[#1a3d2e]/35"
            style={{ left: `${healthyStart}%`, width: `${Math.max(2, healthyEnd - healthyStart)}%` }}
            title="Industry healthy range"
          />
          <div
            className={`absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm ${styles.marker}`}
            style={{ left: `${verdict.youMarkerPct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[#1a3d2e]/50"
            style={{ left: `${verdict.industryMarkerPct}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
          <span>0%</span>
          <span>
            Typical ~{verdict.industryTypical}% ({verdict.industryMin}–{verdict.industryMax}%)
          </span>
          <span>{EARN_BACK_GAUGE_MAX_PERCENT}%+</span>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-on-surface">
        <strong className="text-[#1a3d2e]">Advice:</strong> {verdict.advice}
      </p>
    </div>
  );
}

export function MembershipSetupWalkthrough({
  cafeName,
  merchantSlug,
  currency,
  saving,
  levels,
  pointsPerRinggit,
  centsPerPoint,
  onLevelsChange,
  onRatesChange,
  onComplete,
  onSkip,
}: MembershipSetupWalkthroughProps) {
  const [step, setStep] = useState<StepId>("welcome");
  /** Draft strings so custom number fields accept multi-digit typing (e.g. 50). */
  const [earnDraft, setEarnDraft] = useState<string | null>(null);
  const [centsDraft, setCentsDraft] = useState<string | null>(null);
  /** Custom box wins selection when typing, even if the number matches a preset. */
  const [earnCustomPicked, setEarnCustomPicked] = useState(
    () => !MEMBERSHIP_EARN_PRESETS.some((p) => Math.abs(p.pointsPerRinggit - pointsPerRinggit) < 0.0005),
  );
  const [redeemCustomPicked, setRedeemCustomPicked] = useState(
    () => !MEMBERSHIP_REDEEM_PRESETS.some((p) => p.centsPerPoint === centsPerPoint),
  );
  const symbol = currency === "SGD" ? "S$" : "RM";
  const unitName = currency === "SGD" ? "cent" : "sen";
  const unitNamePlural = currency === "SGD" ? "cents" : "sen";
  /** Same round number for MY/SG so first-time owners can do the math in their head. */
  const spendExample = 10;
  const drinkPrice = 10;
  const earnBack = membershipEarnBackPercent(pointsPerRinggit, centsPerPoint);
  const starterPts = pointsForSpend(spendExample, pointsPerRinggit, 1);
  const visibleLevels = useMemo(() => activeMembershipLevels(levels), [levels]);
  const topLevel = useMemo(() => topActiveMembershipLevel(levels), [levels]);
  const levelCount = membershipLevelCount(levels);
  const topMultiplier = topLevel?.pointsMultiplier ?? 2;
  const topPts = pointsForSpend(spendExample, pointsPerRinggit, topMultiplier);
  const earnCalc = formatEarnCalculation(symbol, spendExample, pointsPerRinggit, 1);
  const earnCalcTop = formatEarnCalculation(
    symbol,
    spendExample,
    pointsPerRinggit,
    topMultiplier,
    topLevel?.name,
  );
  const spendCalc = formatSpendCalculation(
    symbol,
    starterPts,
    centsPerPoint,
    unitNamePlural,
  );
  const starterMoney = moneyForPoints(starterPts, centsPerPoint);
  const visitsForDrink =
    starterMoney > 0 ? Math.max(1, Math.ceil(drinkPrice / starterMoney)) : null;
  const redeemMoney100 = moneyForPoints(100, centsPerPoint);
  const customerName = "Amina";
  const topPtsMoney = moneyForPoints(topPts, centsPerPoint);

  /** First-time only: apply Normal cafe + 10 sen when rates are missing/invalid — keep custom guide rates. */
  useEffect(() => {
    const earnOk = Number.isFinite(pointsPerRinggit) && pointsPerRinggit > 0;
    const redeemOk = Number.isFinite(centsPerPoint) && centsPerPoint > 0;
    if (earnOk && redeemOk) return;
    onRatesChange({
      pointsPerRinggit: earnOk ? pointsPerRinggit : MEMBERSHIP_DEFAULT_EARN.pointsPerRinggit,
      centsPerPoint: redeemOk ? centsPerPoint : MEMBERSHIP_DEFAULT_REDEEM.centsPerPoint,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  function updatePerk(levelNumber: number, perkDescription: string) {
    onLevelsChange(
      levels.map((l) => (l.levelNumber === levelNumber ? { ...l, perkDescription } : l)),
    );
  }

  return (
    <div className={`min-h-[70vh] ${manusDotGridClass}`}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className={manusLabelClass}>
            Set up iRewards · step {stepIndex + 1} of {STEPS.length}
            {STEPS[stepIndex] ? ` · ${STEPS[stepIndex].label}` : ""}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant underline"
          >
            Skip for now
          </button>
        </div>

        <div className="mb-8 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 ${i <= stepIndex ? "bg-[#1a3d2e]" : "bg-surface-container-highest"}`}
              title={s.label}
            />
          ))}
        </div>

        <div className="space-y-8">
          {step === "welcome" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Never run a points system before? No problem.
                </p>
                <p className="mt-2">
                  iRewards is a <strong>points wallet</strong> for {cafeName}. Customers collect{" "}
                  <strong>points</strong> every time they pay. Later they use points for money off.
                  That&apos;s the whole idea.
                </p>
              </AgentLine>

              <TwoColumnCompare
                left={{
                  title: "Collecting (earn)",
                  body: `${customerName} pays her bill → she gets points. More visits = more points in her phone. You choose how many points she gets per ${symbol} 1.`,
                }}
                right={{
                  title: "Using (spend)",
                  body: `Next visit, ${customerName} taps “use points” at checkout → her bill gets cheaper. You choose how much money each point is worth.`,
                }}
              />

              <ScenarioBox
                title={`Full story · ${customerName} at ${cafeName}`}
                steps={[
                  {
                    label: "She sits down and scans the table QR",
                    detail: "Orders on her phone. No app download needed.",
                  },
                  {
                    label: `She pays ${symbol} ${spendExample}`,
                    detail:
                      "After payment we invite her to join iRewards on WhatsApp (optional — guests who skip still ordered fine).",
                  },
                  {
                    label: "She collects points (we set this later)",
                    detail: `Example: ${earnCalc}.`,
                  },
                  {
                    label: "She comes back and uses points",
                    detail: `Those ${starterPts} points become about ${symbol} ${starterMoney.toFixed(2)} off her next bill — if she chooses to use them.`,
                  },
                ]}
              />

              <p className="text-[13px] text-on-surface-variant">
                Next: choose <strong>how many levels</strong>, then set collecting and using. You can
                change every number later.
              </p>
            </>
          )}

          {step === "tiers" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Step 2 — How many member levels?
                </p>
                <p className="mt-2">
                  Levels are the ladder members climb (Starter → …). More levels = more room for
                  gifts and faster collecting. Pick a count that fits {cafeName} — you can turn
                  levels on or off later under Levels &amp; gifts.
                </p>
              </AgentLine>

              <div className="grid gap-3 sm:grid-cols-2">
                {MEMBERSHIP_LEVEL_COUNT_OPTIONS.map((opt) => {
                  const selected = levelCount === opt.count;
                  const preview = applyMembershipLevelCount(levels, opt.count);
                  const names = activeMembershipLevels(preview)
                    .map((l) => l.name)
                    .join(" → ");
                  return (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => onLevelsChange(preview)}
                      className={`border p-4 text-left transition ${
                        selected
                          ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                          : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-headline-sm text-[#1a3d2e]">{opt.label}</p>
                        <ChoiceTick selected={selected} />
                      </div>
                      <p className="mt-3 font-mono text-[11px] leading-snug text-[#1a3d2e]">
                        {names}
                      </p>
                      <p className="mt-2 text-[13px] leading-snug text-on-surface-variant">
                        {opt.hint}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 p-4">
                <p className={manusLabelClass}>Your ladder · {levelCount} levels</p>
                <ol className="mt-3 space-y-2">
                  {visibleLevels.map((level, i) => (
                    <li key={level.levelNumber} className="flex gap-3 text-[14px]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a3d2e] font-mono text-[11px] text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-display text-headline-sm text-[#1a3d2e]">{level.name}</p>
                        <p className="text-[13px] text-on-surface-variant">
                          Unlock after {level.minLifetimePoints} pts ·{" "}
                          {formatDecimal(level.pointsMultiplier)}× collecting speed
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-[13px] text-on-surface-variant">
                Next we set how many points {customerName} collects on each bill.
              </p>
            </>
          )}

          {step === "earn" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Step 3 — How many points does {customerName} get?
                </p>
                <p className="mt-2">
                  This screen is <strong>only collecting</strong>. When she pays{" "}
                  <strong>
                    {symbol} {spendExample}
                  </strong>
                  , how many points go into her wallet? Pick a starting point — or type your own.
                </p>
              </AgentLine>

              <ScenarioBox
                title={`Today · ${customerName} pays ${symbol} ${spendExample}`}
                steps={[
                  {
                    label: "Bill is paid",
                    detail: `Total ${symbol} ${spendExample}. Kitchen gets the order as usual.`,
                  },
                  {
                    label: "We do the maths",
                    detail: `${earnCalc}. Setting: ${formatDecimal(pointsPerRinggit)} points for every ${symbol} 1 she spends.`,
                  },
                  {
                    label: "Points land in her wallet",
                    detail: `She collects ${starterPts} point${starterPts === 1 ? "" : "s"} today. She is not spending them yet — they just sit until she comes back.`,
                  },
                ]}
              />

              <div className="border border-[#1a3d2e]/20 bg-white p-4 font-mono text-[13px] leading-relaxed text-[#1a3d2e]">
                <p className={manusLabelClass}>Calculation</p>
                <p className="mt-2">
                  Bill × rate = points
                </p>
                <p className="mt-1 text-[15px]">
                  <strong>{earnCalc}</strong>
                </p>
              </div>

              <p className={manusLabelClass}>Choose how fast she collects</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {MEMBERSHIP_EARN_PRESETS.map((preset) => {
                  const selected =
                    !earnCustomPicked &&
                    Math.abs(pointsPerRinggit - preset.pointsPerRinggit) < 0.0005;
                  const pts = pointsForSpend(spendExample, preset.pointsPerRinggit, 1);
                  const calc = formatEarnCalculation(
                    symbol,
                    spendExample,
                    preset.pointsPerRinggit,
                    1,
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setEarnDraft(null);
                        setEarnCustomPicked(false);
                        onRatesChange({
                          pointsPerRinggit: preset.pointsPerRinggit,
                          centsPerPoint,
                        });
                      }}
                      className={`border p-4 text-left ${
                        selected
                          ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                          : "border-surface-container-highest bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-headline-sm text-[#1a3d2e]">{preset.label}</p>
                        <ChoiceTick selected={selected} />
                      </div>
                      <p className="mt-1 font-display text-headline-md text-[#1a3d2e]">
                        {formatDecimal(preset.pointsPerRinggit)}{" "}
                        <span className="text-body-md">pts / {symbol}</span>
                      </p>
                      <p className="mt-2 text-[12px] text-on-surface-variant">{preset.hint}</p>
                      <p className="mt-2 font-mono text-[11px] leading-snug text-[#1a3d2e]">
                        {calc}
                      </p>
                      <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                        → {pts} pt{pts === 1 ? "" : "s"} today
                      </p>
                    </button>
                  );
                })}
              </div>

              <div
                className={`block max-w-sm border p-4 ${
                  earnCustomPicked
                    ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                    : "border-surface-container-highest bg-white"
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-2 text-left"
                  onClick={() => setEarnCustomPicked(true)}
                >
                  <span className={manusLabelClass}>
                    Or type your own (points per {symbol} 1 spent)
                  </span>
                  <ChoiceTick selected={earnCustomPicked} />
                </button>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={earnDraft ?? String(pointsPerRinggit)}
                  onFocus={() => setEarnCustomPicked(true)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setEarnCustomPicked(true);
                    setEarnDraft(raw);
                    const n = Number(raw);
                    if (raw !== "" && Number.isFinite(n) && n > 0) {
                      onRatesChange({
                        pointsPerRinggit: Math.min(10, Math.max(0.01, n)),
                        centsPerPoint,
                      });
                    }
                  }}
                  onBlur={() => {
                    const n = Number(earnDraft ?? pointsPerRinggit);
                    const next = Number.isFinite(n) && n > 0 ? Math.min(10, Math.max(0.01, n)) : 0.1;
                    setEarnDraft(null);
                    onRatesChange({ pointsPerRinggit: next, centsPerPoint });
                  }}
                  className="mt-2 w-full border-0 border-b border-surface-container-highest bg-transparent py-1.5 font-display text-headline-sm text-[#1a3d2e] focus:border-[#1a3d2e] focus:outline-none"
                />
                <p className="mt-2 font-mono text-[12px] leading-snug text-[#1a3d2e]">{earnCalc}</p>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  {topLevel?.name ?? "Top level"} on the same bill: {earnCalcTop}
                </p>
              </div>
            </>
          )}

          {step === "redeem" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Step 4 — What are those points worth in money?
                </p>
                <p className="mt-2">
                  Last step {customerName} <strong>collected {starterPts} points</strong>. This
                  screen is <strong>only using points</strong> — turning them into money off when
                  she pays next time.
                </p>
              </AgentLine>

              <TwoColumnCompare
                left={{
                  title: "Already done (step 2)",
                  body: `She collected ${starterPts} points after paying ${symbol} ${spendExample}. Those points are waiting in her wallet.`,
                }}
                right={{
                  title: "Now (this step)",
                  body: `When she spends those ${starterPts} points at checkout, how many ${symbol} off does she get? That is what you set here.`,
                }}
              />

              <ScenarioBox
                title={`Next week · ${customerName} comes back`}
                steps={[
                  {
                    label: "She still has her points",
                    detail: `From last visit she collected ${starterPts} point${starterPts === 1 ? "" : "s"} (${earnCalc}).`,
                  },
                  {
                    label: "We do the spend maths",
                    detail: `${spendCalc}. Setting: each point = ${centsPerPoint} ${unitName}.`,
                  },
                  {
                    label: "Easy check — free drink?",
                    detail:
                      visitsForDrink != null
                        ? `A ${symbol} ${drinkPrice} drink needs about ${visitsForDrink} visits like hers if she saves every point.`
                        : "Pick a value below to see how many visits to a free drink.",
                  },
                ]}
              />

              <div className="border border-[#1a3d2e]/20 bg-white p-4 font-mono text-[13px] leading-relaxed text-[#1a3d2e]">
                <p className={manusLabelClass}>Calculation</p>
                <p className="mt-2">{spendCalc}</p>
                <p className="mt-1 text-on-surface-variant">
                  Also: 100 pts × {centsPerPoint} {unitNamePlural} = {symbol}{" "}
                  {redeemMoney100.toFixed(2)} off
                </p>
              </div>

              <p className={manusLabelClass}>Choose what 1 point is worth when she uses it</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {MEMBERSHIP_REDEEM_PRESETS.map((preset) => {
                  const selected =
                    !redeemCustomPicked && centsPerPoint === preset.centsPerPoint;
                  const back = membershipEarnBackPercent(pointsPerRinggit, preset.centsPerPoint);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setCentsDraft(null);
                        setRedeemCustomPicked(false);
                        onRatesChange({
                          pointsPerRinggit,
                          centsPerPoint: preset.centsPerPoint,
                        });
                      }}
                      className={`border p-4 text-left ${
                        selected
                          ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                          : "border-surface-container-highest bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-headline-sm text-[#1a3d2e]">
                          {preset.centsPerPoint} {unitNamePlural} / point
                        </p>
                        <ChoiceTick selected={selected} />
                      </div>
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        1 point = {symbol} {(preset.centsPerPoint / 100).toFixed(2)} off
                      </p>
                      <p className="mt-3 font-mono text-[11px] leading-snug text-[#1a3d2e]">
                        {formatSpendCalculation(
                          symbol,
                          starterPts,
                          preset.centsPerPoint,
                          unitNamePlural,
                        )}
                      </p>
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        ~{formatDecimal(back)}% of her spend comes back
                      </p>
                    </button>
                  );
                })}
              </div>

              <div
                className={`block max-w-sm border p-4 ${
                  redeemCustomPicked
                    ? "border-[#1a3d2e] bg-[#1a3d2e]/5"
                    : "border-surface-container-highest bg-white"
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-2 text-left"
                  onClick={() => setRedeemCustomPicked(true)}
                >
                  <span className={manusLabelClass}>
                    Or type your own ({unitNamePlural} per point)
                  </span>
                  <ChoiceTick selected={redeemCustomPicked} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={centsDraft ?? String(centsPerPoint)}
                  onFocus={() => setRedeemCustomPicked(true)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setRedeemCustomPicked(true);
                    setCentsDraft(raw);
                    const n = Number(raw);
                    if (raw !== "" && Number.isFinite(n) && n >= 1) {
                      onRatesChange({
                        pointsPerRinggit,
                        centsPerPoint: Math.min(100, Math.max(1, Math.round(n))),
                      });
                    }
                  }}
                  onBlur={() => {
                    const n = Number(centsDraft ?? centsPerPoint);
                    const next =
                      Number.isFinite(n) && n >= 1 ? Math.min(100, Math.max(1, Math.round(n))) : 10;
                    setCentsDraft(null);
                    onRatesChange({ pointsPerRinggit, centsPerPoint: next });
                  }}
                  className="mt-2 w-full border-0 border-b border-surface-container-highest bg-transparent py-1.5 font-display text-headline-sm text-[#1a3d2e] focus:border-[#1a3d2e] focus:outline-none"
                />
                <p className="mt-2 font-mono text-[12px] leading-snug text-[#1a3d2e]">{spendCalc}</p>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  Or: 100 points × {centsPerPoint} {unitNamePlural} = {symbol}{" "}
                  {redeemMoney100.toFixed(2)} off.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[100, 200, 500, 1000].map((pts) => (
                  <span
                    key={pts}
                    className="border border-[#1a3d2e]/20 bg-white px-3 py-1.5 font-mono text-[11px] text-[#1a3d2e]"
                  >
                    Use {pts} pts → {symbol} {moneyForPoints(pts, centsPerPoint).toFixed(0)} off
                  </span>
                ))}
              </div>
            </>
          )}

          {step === "perks" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Step 5 — Levels: collecting speed &amp; gifts
                </p>
                <p className="mt-2">
                  When {customerName} collects enough points lifetime, she{" "}
                  <strong>reaches a level</strong>. Higher levels do two things: they earn points{" "}
                  <strong>faster</strong> (collecting speed), and they unlock{" "}
                  <strong>gifts</strong> you write here (e.g. Free coffee). Money off the bill still
                  comes from <strong>using points</strong> — not a separate % discount.
                </p>
              </AgentLine>

              <div className="border border-[#1a3d2e]/20 bg-[#1a3d2e]/5 p-4">
                <p className={manusLabelClass}>What “collecting speed” means</p>
                <p className="mt-2 text-[14px] leading-relaxed text-on-surface">
                  On a <strong>{symbol} {spendExample}</strong> bill at your rate of{" "}
                  <strong>{formatDecimal(pointsPerRinggit)} pts / {symbol}</strong>:
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[#1a3d2e]/20 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        <th className="py-2 pr-3">Level</th>
                        <th className="py-2 pr-3">Speed</th>
                        <th className="py-2">Points on that bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLevels.map((level) => {
                        const pts = pointsForSpend(
                          spendExample,
                          pointsPerRinggit,
                          level.pointsMultiplier,
                        );
                        return (
                          <tr
                            key={level.levelNumber}
                            className="border-b border-surface-container-highest/80"
                          >
                            <td className="py-2 pr-3 font-display text-headline-sm text-[#1a3d2e]">
                              {level.name}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[#1a3d2e]">
                              {formatDecimal(level.pointsMultiplier)}×
                            </td>
                            <td className="py-2 text-on-surface">
                              {pts} pt{pts === 1 ? "" : "s"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[13px] text-on-surface-variant">
                  {topLevel
                    ? `So ${topLevel.name} at ${formatDecimal(topLevel.pointsMultiplier)}× collects points faster than Starter on the same spend.`
                    : "Higher levels collect points faster on the same spend."}
                </p>
              </div>

              <ScenarioBox
                title={`Same story · ${customerName} becomes a regular`}
                steps={[
                  {
                    label: "First visits — Starter",
                    detail: `She collects at 1× speed (${earnCalc}). She can use those points for money off.`,
                  },
                  {
                    label: `She reaches ${visibleLevels[1]?.name ?? "the next level"}`,
                    detail: visibleLevels[1]
                      ? `After ${visibleLevels[1].minLifetimePoints} pts lifetime she unlocks gifts${
                          parseLevelGifts(visibleLevels[1].perkDescription).length
                            ? ` — e.g. “${parseLevelGifts(visibleLevels[1].perkDescription)[0]}”`
                            : ""
                        } and collects at ${formatDecimal(visibleLevels[1].pointsMultiplier)}× speed.`
                      : "Higher levels unlock gifts and a faster collecting speed.",
                  },
                  {
                    label: "Gifts ≠ spending points",
                    detail:
                      "Gifts are level perks (staff honours them). Money off the bill still comes from using points at checkout.",
                  },
                ]}
              />

              <div className="space-y-3">
                {visibleLevels.map((level) => (
                  <div
                    key={level.levelNumber}
                    className="border border-surface-container-highest bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-headline-sm text-[#1a3d2e]">{level.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-on-surface-variant">
                          Unlocks after {level.minLifetimePoints} pts lifetime
                        </p>
                      </div>
                      <label className="min-w-[140px]">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                          Collecting speed
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            step={0.05}
                            value={level.pointsMultiplier}
                            onChange={(e) =>
                              onLevelsChange(
                                levels.map((l) =>
                                  l.levelNumber === level.levelNumber
                                    ? {
                                        ...l,
                                        pointsMultiplier: Math.max(
                                          1,
                                          Number(e.target.value) || 1,
                                        ),
                                      }
                                    : l,
                                ),
                              )
                            }
                            className="w-20 border-0 border-b border-surface-container-highest bg-transparent py-1 font-display text-headline-sm text-[#1a3d2e] focus:border-[#1a3d2e] focus:outline-none"
                          />
                          <span className="font-mono text-[12px] text-on-surface-variant">×</span>
                        </div>
                      </label>
                    </div>
                    <p className="mt-3 text-[13px] text-on-surface-variant">
                      When {customerName} reaches {level.name}, she sees these gifts:
                    </p>
                    <LevelGiftsEditor
                      key={level.levelNumber}
                      gifts={parseLevelGifts(level.perkDescription)}
                      onChange={(gifts) =>
                        updatePerk(level.levelNumber, joinLevelGifts(gifts))
                      }
                      placeholder={
                        level.levelNumber === 1
                          ? "e.g. Welcome drink"
                          : "e.g. Free coffee"
                      }
                    />
                  </div>
                ))}
              </div>

              <p className="text-[13px] text-on-surface-variant">
                Tip: keep gifts short — “Free coffee”, “Free topping”. You can tweak unlock points
                and collecting speed later under <strong>Levels &amp; gifts</strong>.
              </p>
            </>
          )}

          {step === "roi" && (
            <>
              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  Step 6 — Review your settings for {cafeName}
                </p>
                <p className="mt-2">
                  First check what you chose in steps 2–4. Then scroll down for the cost story —
                  what {customerName} gets back, and what that means for your till.
                </p>
              </AgentLine>

              <div className="border border-[#1a3d2e]/20 bg-white p-4">
                <p className={manusLabelClass}>Your settings summary</p>
                <dl className="mt-4 space-y-4">
                  <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                      Collecting
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-on-surface">
                      <span className="font-display text-headline-sm text-[#1a3d2e]">
                        {formatDecimal(pointsPerRinggit)} pts / {symbol} 1
                      </span>
                      <span className="mt-0.5 block text-[13px] text-on-surface-variant">
                        On a {symbol} {spendExample} bill: {earnCalc}
                        {MEMBERSHIP_EARN_PRESETS.find(
                          (p) => p.pointsPerRinggit === pointsPerRinggit,
                        )
                          ? ` · ${MEMBERSHIP_EARN_PRESETS.find((p) => p.pointsPerRinggit === pointsPerRinggit)!.label}`
                          : " · custom rate"}
                      </span>
                    </dd>
                  </div>
                  <div className="grid gap-1 border-t border-surface-container-highest pt-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                      Using points
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-on-surface">
                      <span className="font-display text-headline-sm text-[#1a3d2e]">
                        {centsPerPoint} {unitNamePlural} / point
                      </span>
                      <span className="mt-0.5 block text-[13px] text-on-surface-variant">
                        1 point = {symbol} {(centsPerPoint / 100).toFixed(2)} off · {spendCalc}
                        {MEMBERSHIP_REDEEM_PRESETS.find((p) => p.centsPerPoint === centsPerPoint)
                          ? ` · ${MEMBERSHIP_REDEEM_PRESETS.find((p) => p.centsPerPoint === centsPerPoint)!.label}`
                          : " · custom value"}
                      </span>
                    </dd>
                  </div>
                  <div className="grid gap-1 border-t border-surface-container-highest pt-4 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                      Come-back rate
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-on-surface">
                      <span className="font-display text-headline-sm text-[#1a3d2e]">
                        ~{formatDecimal(earnBack)}% at Starter
                      </span>
                      <span className="mt-0.5 block text-[13px] text-on-surface-variant">
                        Base rate (1×). At {topLevel?.name ?? "top level"} (
                        {formatDecimal(topMultiplier)}×) the same {symbol} {spendExample} visit
                        yields {topPts} pts ≈ {symbol} {topPtsMoney.toFixed(2)} off if fully used.
                      </span>
                    </dd>
                  </div>
                  <div className="border-t border-surface-container-highest pt-4">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                      Member levels & gifts ({levelCount})
                    </dt>
                    <dd className="mt-3 space-y-2">
                      {visibleLevels.map((level) => (
                        <div
                          key={level.levelNumber}
                          className="flex flex-col gap-0.5 border border-surface-container-highest bg-[#1a3d2e]/5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-display text-headline-sm text-[#1a3d2e]">
                              {level.name}
                            </p>
                            <p className="font-mono text-[11px] text-on-surface-variant">
                              after {level.minLifetimePoints} pts ·{" "}
                              {formatDecimal(level.pointsMultiplier)}× collecting speed ·{" "}
                              {pointsForSpend(
                                spendExample,
                                pointsPerRinggit,
                                level.pointsMultiplier,
                              )}{" "}
                              pts on a {symbol} {spendExample} bill
                            </p>
                          </div>
                          <p className="text-[13px] text-on-surface sm:max-w-[55%] sm:text-right">
                            {level.perkDescription?.trim()
                              ? level.perkDescription.trim().split("\n").join(" · ")
                              : "No gift line"}
                          </p>
                        </div>
                      ))}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-[13px] text-on-surface-variant">
                  Need to change something? Use <strong>Back</strong> to edit collecting, using
                  points, or gifts — then return here.
                </p>
              </div>

              <div className="border-t border-surface-container-highest pt-2">
                <p className={manusLabelClass}>ROI calculator</p>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  Pick a level and tweak cafe numbers — same calculator as under Rewards → ROI.
                </p>
              </div>

              <AgentLine>
                <p className="font-display text-headline-md text-[#1a3d2e]">
                  What does this cost {cafeName}?
                </p>
                <p className="mt-2">
                  Costs depend on <strong>which level</strong> you model. Starter is cheaper;
                  {topLevel ? ` ${topLevel.name}` : " higher levels"} collect faster. Use the
                  calculator below.
                </p>
              </AgentLine>

              <VerdictGauge
                earnBack={earnBack}
                currency={currency}
                symbol={symbol}
                spendExample={spendExample}
                rewardMoney={starterMoney}
                customerName={customerName}
              />

              <PointsRoiPanel
                merchantSlug={merchantSlug}
                currency={currency}
                settings={{
                  pointsPerRinggit,
                  pointsRedeemCentsPerPoint: centsPerPoint,
                }}
                levels={levels}
                rules={[]}
                variant="guide"
                defaultAvgOrder={spendExample}
                customerName={customerName}
              />

              <p className="text-[13px] text-on-surface-variant">
                Too generous? Go back and collect fewer points or make each point worth less. Too
                tight? Do the opposite. You can always fine-tune later under Points or reopen this
                guide.
              </p>
            </>
          )}
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="h-11 px-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant"
            >
              Back
            </button>
          )}
          {step !== "roi" ? (
            <button type="button" onClick={goNext} className={`${manusPrimaryButtonClass} max-w-xs`}>
              {step === "welcome"
                ? "Next: how many levels"
                : step === "tiers"
                  ? "Next: collecting points"
                  : step === "earn"
                    ? "Next: using points"
                    : step === "redeem"
                      ? "Next: levels & gifts"
                      : "Next: ROI calculator"}
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={onComplete}
              className={`${manusPrimaryButtonClass} max-w-xs`}
            >
              <Icon name="done" className="text-[16px]" />
              {saving ? "Saving…" : "Save my rewards program"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
