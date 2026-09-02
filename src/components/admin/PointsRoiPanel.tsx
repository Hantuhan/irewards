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

type PointsRoiPanelProps = {
  merchantSlug: string;
  currency: "MYR" | "SGD";
  settings: { pointsPerRinggit: number; pointsRedeemCentsPerPoint: number };
  levels: RewardLevelConfig[];
  rules: PointsRule[];
};

const inputClass =
  "mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md";

export function PointsRoiPanel({
  merchantSlug,
  currency,
  settings,
  levels,
  rules,
}: PointsRoiPanelProps) {
  const symbol = currency === "SGD" ? "S$" : "RM";
  const [scenario, setScenario] = useState<PointsRoiScenario>(DEFAULT_ROI_SCENARIO);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const topTier = useMemo(() => {
    const active = levels.filter((l) => l.tierActive !== false);
    return active[active.length - 1] ?? levels[levels.length - 1];
  }, [levels]);

  const program = useMemo(
    () => ({
      pointsPerRinggit: settings.pointsPerRinggit,
      centsPerPoint: settings.pointsRedeemCentsPerPoint,
      currency,
      topTierName: topTier?.name ?? "Platinum",
      topTierMultiplier: topTier?.pointsMultiplier ?? 1.5,
      rules,
    }),
    [settings, currency, topTier, rules],
  );

  const roi = useMemo(() => calculatePointsRoi(program, scenario), [program, scenario]);
  const { configured, messages, loading, send, clearChat } = usePointsRoiChat(
    merchantSlug,
    scenario,
    program,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  async function handleSubmit() {
    const ok = await send(input);
    if (ok) setInput("");
  }

  function updateScenario<K extends keyof PointsRoiScenario>(key: K, value: PointsRoiScenario[K]) {
    setScenario((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="space-y-6">
        <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
          <h2 className="font-display text-headline-sm text-primary">Point ROI calculator</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Model earn-back, monthly reward liability, and margin impact. Answers use{" "}
            <strong>your store&apos;s live sales &amp; member data</strong> and compare to MY/SG
            industry benchmarks.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Avg order ({symbol})
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={scenario.avgOrderRm}
                onChange={(e) => updateScenario("avgOrderRm", Number(e.target.value))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Active members
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={scenario.activeMembers}
                onChange={(e) => updateScenario("activeMembers", Number(e.target.value))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Visits / member / month
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={scenario.visitsPerMemberMonth}
                onChange={(e) => updateScenario("visitsPerMemberMonth", Number(e.target.value))}
                className={inputClass}
              />
            </label>
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
            <label className="block sm:col-span-2">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Redemption rate % (points actually redeemed)
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={scenario.redemptionRatePercent}
                onChange={(e) => updateScenario("redemptionRatePercent", Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
              <p className="mt-1 font-mono text-label-mono text-primary">
                {formatDecimal(scenario.redemptionRatePercent, 0)}%
              </p>
            </label>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Earn-back rate",
              value: `${formatDecimal(roi.earnBackPercent)}%`,
              hint: "Theoretical cashback from earn + redeem",
            },
            {
              label: "Reward cost / revenue",
              value: `${formatDecimal(roi.costAsPercentOfRevenue)}%`,
              hint: "Monthly liability vs gross sales",
            },
            {
              label: "Net margin after rewards",
              value: `${formatDecimal(roi.netMarginAfterRewardsPercent)}%`,
              hint: `After ${formatDecimal(scenario.grossMarginPercent, 0)}% gross margin`,
            },
            {
              label: "Points per visit",
              value: String(roi.pointsPerVisit),
              hint: `${topTier?.name ?? "Top tier"} multiplier applied`,
            },
            {
              label: "Monthly liability",
              value: `${symbol} ${formatDecimal(roi.monthlyRedemptionLiabilityRm)}`,
              hint: `${formatDecimal(roi.monthlyPointsIssued, 0)} pts issued`,
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
                {loading && (
                  <p className="text-body-md text-on-surface-variant">Thinking…</p>
                )}
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
