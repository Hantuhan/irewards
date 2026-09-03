"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ui/ChatMarkdown";
import { Icon } from "@/components/ui/Icon";
import { formatDecimal } from "@/lib/format/number";
import {
  POINTS_ROI_CHAT_STARTERS,
  usePointsRoiChat,
} from "@/lib/merchant/use-points-roi-chat";
import {
  calculatePointsRoi,
  DEFAULT_ROI_SCENARIO,
  type PointsRoiScenario,
} from "@/lib/loyalty/points-roi";
import type { PointsRule } from "@/lib/loyalty/points-rules";
import type { RewardLevelConfig } from "@/lib/loyalty/default-reward-levels";
import {
  activeMembershipLevels,
  formatEarnCalculation,
  moneyForPoints,
  topActiveMembershipLevel,
} from "@/lib/loyalty/membership-setup";
import { manusLabelClass } from "@/lib/ui/manus";

type PointsRoiPanelProps = {
  merchantSlug: string;
  currency: "MYR" | "SGD";
  settings: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number };
  levels: RewardLevelConfig[];
  rules: PointsRule[];
  /** `guide` = wizard-friendly calculator (no chat). `full` = admin tab with chat. */
  variant?: "full" | "guide";
  /** Guide defaults to RM/S$ 10 so owners can follow the maths. */
  defaultAvgOrder?: number;
  customerName?: string;
};

const inputClass =
  "mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md";

const guideInputClass =
  "mt-1 w-full border-0 border-b border-surface-container-highest bg-transparent py-2 font-display text-headline-sm text-[#1a3d2e] focus:border-[#1a3d2e] focus:outline-none";

export function PointsRoiPanel({
  merchantSlug,
  currency,
  settings,
  levels,
  rules,
  variant = "full",
  defaultAvgOrder,
  customerName = "Amina",
}: PointsRoiPanelProps) {
  const isGuide = variant === "guide";
  const symbol = currency === "SGD" ? "S$" : "RM";
  const unitNamePlural = currency === "SGD" ? "cents" : "sen";
  const activeLevels = useMemo(() => activeMembershipLevels(levels), [levels]);
  const defaultTop = useMemo(() => topActiveMembershipLevel(levels), [levels]);

  const [levelNumber, setLevelNumber] = useState(
    () => defaultTop?.levelNumber ?? activeLevels[activeLevels.length - 1]?.levelNumber ?? 1,
  );
  const [scenario, setScenario] = useState<PointsRoiScenario>(() => ({
    ...DEFAULT_ROI_SCENARIO,
    avgOrderRm: defaultAvgOrder ?? (isGuide ? 10 : DEFAULT_ROI_SCENARIO.avgOrderRm),
  }));
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stillActive = activeLevels.some((l) => l.levelNumber === levelNumber);
    if (!stillActive && defaultTop) setLevelNumber(defaultTop.levelNumber);
  }, [activeLevels, defaultTop, levelNumber]);

  const selectedLevel =
    activeLevels.find((l) => l.levelNumber === levelNumber) ?? defaultTop ?? activeLevels[0];

  const program = useMemo(
    () => ({
      pointsPerRinggit: settings.pointsPerRinggit,
      centsPerPoint: settings.pointsRedeemCentsPerPoint,
      currency,
      topTierName: selectedLevel?.name ?? "Platinum",
      topTierMultiplier: selectedLevel?.pointsMultiplier ?? 1,
      rules,
    }),
    [settings, currency, selectedLevel, rules],
  );

  const roi = useMemo(() => calculatePointsRoi(program, scenario), [program, scenario]);
  const { configured, messages, loading, send, clearChat } = usePointsRoiChat(
    merchantSlug,
    scenario,
    program,
  );

  const fullRedeemRm = moneyForPoints(roi.pointsPerVisit, settings.pointsRedeemCentsPerPoint);
  const visitEarnBackPct =
    scenario.avgOrderRm > 0 ? (fullRedeemRm / scenario.avgOrderRm) * 100 : 0;
  const earnCalc = formatEarnCalculation(
    symbol,
    scenario.avgOrderRm,
    settings.pointsPerRinggit,
    selectedLevel?.pointsMultiplier ?? 1,
    selectedLevel?.name,
  );

  useEffect(() => {
    if (isGuide) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isGuide]);

  useEffect(() => {
    if (isGuide) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input, isGuide]);

  async function handleSubmit() {
    const ok = await send(input);
    if (ok) setInput("");
  }

  function updateScenario<K extends keyof PointsRoiScenario>(key: K, value: PointsRoiScenario[K]) {
    setScenario((prev) => ({ ...prev, [key]: value }));
  }

  const levelSelect = (
    <label className="block sm:col-span-2">
      <span
        className={
          isGuide
            ? "mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
            : "font-display text-eyebrow uppercase text-on-surface-variant"
        }
      >
        Calculate for level
      </span>
      <select
        value={selectedLevel?.levelNumber ?? 1}
        onChange={(e) => setLevelNumber(Number(e.target.value))}
        className={isGuide ? guideInputClass : inputClass}
      >
        {activeLevels.map((level) => (
          <option key={level.levelNumber} value={level.levelNumber}>
            {level.name} · {formatDecimal(level.pointsMultiplier)}× collecting speed
          </option>
        ))}
      </select>
      <p className="mt-1 text-[12px] text-on-surface-variant">
        Cost story uses <strong>{selectedLevel?.name ?? "this level"}</strong> — not every member
        is at the top of the ladder.
      </p>
    </label>
  );

  const scenarioFields = (
    <div className={`grid gap-4 ${isGuide ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      {levelSelect}
      <label className="block">
        <span
          className={
            isGuide
              ? "mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
              : "font-display text-eyebrow uppercase text-on-surface-variant"
          }
        >
          Avg order ({symbol})
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={scenario.avgOrderRm}
          onChange={(e) => updateScenario("avgOrderRm", Number(e.target.value))}
          className={isGuide ? guideInputClass : inputClass}
        />
      </label>
      <label className="block">
        <span
          className={
            isGuide
              ? "mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
              : "font-display text-eyebrow uppercase text-on-surface-variant"
          }
        >
          Active members
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={scenario.activeMembers}
          onChange={(e) => updateScenario("activeMembers", Number(e.target.value))}
          className={isGuide ? guideInputClass : inputClass}
        />
      </label>
      <label className="block">
        <span
          className={
            isGuide
              ? "mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
              : "font-display text-eyebrow uppercase text-on-surface-variant"
          }
        >
          Visits / member / month
        </span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={scenario.visitsPerMemberMonth}
          onChange={(e) => updateScenario("visitsPerMemberMonth", Number(e.target.value))}
          className={isGuide ? guideInputClass : inputClass}
        />
      </label>
      {!isGuide && (
        <label className="block">
          <span className="font-display text-eyebrow uppercase text-on-surface-variant">
            Gross margin %
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={scenario.grossMarginPercent}
            onChange={(e) => updateScenario("grossMarginPercent", Number(e.target.value))}
            className={inputClass}
          />
        </label>
      )}
      <label className={`block ${isGuide ? "sm:col-span-2" : "sm:col-span-2"}`}>
        <span
          className={
            isGuide
              ? "mb-1 block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
              : "font-display text-eyebrow uppercase text-on-surface-variant"
          }
        >
          Redemption rate % (points actually used)
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={scenario.redemptionRatePercent}
          onChange={(e) => updateScenario("redemptionRatePercent", Number(e.target.value))}
          className={`mt-2 w-full ${isGuide ? "accent-[#1a3d2e]" : "accent-primary"}`}
        />
        <p
          className={`mt-1 font-mono text-label-mono ${isGuide ? "text-[#1a3d2e]" : "text-primary"}`}
        >
          {formatDecimal(scenario.redemptionRatePercent, 0)}%
        </p>
      </label>
    </div>
  );

  if (isGuide) {
    return (
      <div className="space-y-6">
        <div className="border border-[#1a3d2e]/20 bg-white p-4">
          <p className={manusLabelClass}>ROI calculator</p>
          <p className="mt-2 text-[14px] leading-relaxed text-on-surface">
            Tweak the numbers below. Results update for the level you pick — right now{" "}
            <strong>{selectedLevel?.name ?? "top level"}</strong>.
          </p>
          <div className="mt-4">{scenarioFields}</div>
        </div>

        <div className="space-y-3">
          <LaymanStat
            title="Points on one visit"
            value={`${roi.pointsPerVisit} pts`}
            story={`On a ${symbol} ${formatDecimal(scenario.avgOrderRm)} bill, a ${selectedLevel?.name ?? "member"} (${formatDecimal(selectedLevel?.pointsMultiplier ?? 1)}× speed) collects ${roi.pointsPerVisit} point${roi.pointsPerVisit === 1 ? "" : "s"}.`}
            calc={earnCalc}
          />
          <LaymanStat
            title="What those points are worth"
            value={`${formatDecimal(visitEarnBackPct)}%`}
            story={`If ${customerName} is on ${selectedLevel?.name ?? "this level"}, spends ${symbol} ${formatDecimal(scenario.avgOrderRm)}, and later uses every point from that visit, she gets about ${symbol} ${fullRedeemRm.toFixed(2)} off. So about ${formatDecimal(visitEarnBackPct)}% of what she spent can come back as a discount.`}
            calc={`${symbol} ${formatDecimal(scenario.avgOrderRm)} → ${roi.pointsPerVisit} pts → ${symbol} ${fullRedeemRm.toFixed(2)} off (= ${formatDecimal(visitEarnBackPct)}%)`}
          />
          <LaymanStat
            title="Not everyone uses their points"
            value={`${formatDecimal(roi.costAsPercentOfRevenue)}% of sales`}
            story={`In real life many people save points or forget them. At ${formatDecimal(scenario.redemptionRatePercent, 0)}% used, your true cost for ${selectedLevel?.name ?? "this level"} members is closer to ${formatDecimal(roi.costAsPercentOfRevenue)}% of member sales — not the full ${formatDecimal(visitEarnBackPct)}%.`}
            calc={`~${formatDecimal(scenario.redemptionRatePercent, 0)}% of points used → cost ≈ ${formatDecimal(roi.costAsPercentOfRevenue)}% of sales`}
          />
          <LaymanStat
            title="Busy month for the whole cafe"
            value={`${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm, 0)}`}
            story={`Imagine ~${formatDecimal(scenario.activeMembers, 0)} members (modelled as ${selectedLevel?.name ?? "this level"}), each visiting ${formatDecimal(scenario.visitsPerMemberMonth)}× a month, each spending about ${symbol} ${formatDecimal(scenario.avgOrderRm)}. If they use about ${formatDecimal(scenario.redemptionRatePercent, 0)}% of their points, you give roughly ${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm, 0)} off across the whole month.`}
            calc={`${formatDecimal(scenario.activeMembers, 0)} members × ${formatDecimal(scenario.visitsPerMemberMonth)} visits × ~${symbol} ${(roi.rewardValuePerVisitRm ?? 0).toFixed(2)} used per visit ≈ ${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm, 0)}`}
          />
        </div>

        <p className="text-[12px] text-on-surface-variant">
          Tip: try Starter first (cheapest), then your top level — so you see the range, not only
          the most expensive members.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="space-y-6">
        <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
          <h2 className="font-display text-headline-sm text-primary">What this costs you</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Same story as the iRewards guide — how much of sales can come back as rewards, and a
            rough monthly cost. Pick a level so the maths matches that collecting speed.
          </p>
          <div className="mt-6">{scenarioFields}</div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Comes back as rewards",
              value: `${formatDecimal(visitEarnBackPct)}%`,
              hint: `If a ${selectedLevel?.name ?? "member"} later uses every point from a visit`,
            },
            {
              label: "True cost / sales",
              value: `${formatDecimal(roi.costAsPercentOfRevenue)}%`,
              hint: `After ~${formatDecimal(scenario.redemptionRatePercent, 0)}% of points actually get used`,
            },
            {
              label: "Net margin after rewards",
              value: `${formatDecimal(roi.netMarginAfterRewardsPercent)}%`,
              hint: `After ${formatDecimal(scenario.grossMarginPercent, 0)}% gross margin`,
            },
            {
              label: "Points per visit",
              value: String(roi.pointsPerVisit),
              hint: `${selectedLevel?.name ?? "Level"} · ${formatDecimal(selectedLevel?.pointsMultiplier ?? 1)}× speed`,
            },
            {
              label: "Monthly liability",
              value: `${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm)}`,
              hint: `${formatDecimal(roi.monthlyPointsIssued, 0)} pts issued (${selectedLevel?.name ?? "level"})`,
            },
            {
              label: "Break-even visits",
              value: roi.visitsToBreakEven ? String(roi.visitsToBreakEven) : "—",
              hint: "Extra visits to offset rewards",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="border border-surface-container-highest bg-surface-container-lowest p-4"
            >
              <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                {card.label}
              </p>
              <p className="mt-1 font-display text-headline-md text-primary">{card.value}</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="border border-primary/20 bg-surface-container-low p-6">
          <p className="font-display text-eyebrow uppercase text-primary">What this means</p>
          <ul className="mt-3 space-y-2">
            {roi.insights.map((line) => (
              <li key={line} className="flex gap-2 text-body-md text-on-surface-variant">
                <Icon name="insights" className="mt-0.5 shrink-0 text-base text-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="border border-surface-container-highest bg-surface-container-lowest">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-surface-container-highest px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 font-display text-headline-sm text-primary">
            <Icon name="psychology" />
            Ask about ROI
          </span>
          <Icon name={chatOpen ? "expand_less" : "expand_more"} />
        </button>

        {chatOpen && (
          <div className="flex max-h-[640px] flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {configured === false && (
                <p className="mb-3 border border-amber-200 bg-amber-50 p-3 text-body-md text-amber-900">
                  Add <strong>DEEPSEEK_API_KEY</strong> for richer answers. Rule-based fallback is
                  active.
                </p>
              )}
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-body-md text-on-surface-variant">
                    Ask how earn rate, tiers, or redemption affect your margin.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POINTS_ROI_CHAT_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setInput(starter)}
                        className="border border-surface-container-highest px-2 py-1 text-left text-[11px] text-on-surface-variant hover:border-primary hover:text-primary"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={
                      msg.role === "user"
                        ? "ml-6 border border-surface-container-highest bg-surface-container-low p-3"
                        : "mr-2 border border-primary/15 bg-surface-container-lowest p-3"
                    }
                  >
                    <ChatMarkdown content={msg.content} />
                  </div>
                ))}
                {loading && <p className="text-body-md text-on-surface-variant">Thinking…</p>}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-surface-container-highest p-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                rows={2}
                placeholder="e.g. Is 10 cents/point too generous?"
                className="w-full resize-none border border-surface-container-highest px-3 py-2 text-body-md outline-none focus:border-primary"
              />
              <div className="mt-2 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  className="px-2 py-1 font-mono text-label-mono text-on-surface-variant"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
                >
                  <Icon name="send" />
                  Ask
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function LaymanStat({
  title,
  value,
  story,
  calc,
}: {
  title: string;
  value: string;
  story: string;
  calc: string;
}) {
  return (
    <div className="border border-surface-container-highest bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={manusLabelClass}>{title}</p>
        <p className="font-display text-headline-sm text-[#1a3d2e]">{value}</p>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-on-surface">{story}</p>
      <p className="mt-2 font-mono text-[11px] leading-snug text-[#1a3d2e]">{calc}</p>
    </div>
  );
}
