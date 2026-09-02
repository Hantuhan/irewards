"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ui/ChatMarkdown";
import { Icon } from "@/components/ui/Icon";
import {
  REPORTS_CHAT_STARTERS,
  useReportsIntelligenceChat,
} from "@/lib/merchant/use-reports-intelligence-chat";
import type { IntelligenceReport } from "@/lib/reports/intelligence";

type ReportsIntelligentPanelProps = {
  merchantSlug: string;
  intelligence: IntelligenceReport;
  symbol: string;
};

function money(symbol: string, cents: number) {
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function pctBadge(value: number) {
  const positive = value >= 0;
  return (
    <span className={positive ? "text-emerald-700" : "text-red-700"}>
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

type InsightCard = {
  id: string;
  icon: string;
  title: string;
  meta: string;
  lift: string;
  tip: string;
  priority: "high" | "medium" | "low";
};

function priorityStyles(priority: InsightCard["priority"]) {
  if (priority === "high") return "border-l-4 border-l-emerald-600";
  if (priority === "medium") return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-surface-container-highest";
}

export function ReportsIntelligentPanel({
  merchantSlug,
  intelligence,
  symbol,
}: ReportsIntelligentPanelProps) {
  const { configured, messages, loading, send, clearChat } =
    useReportsIntelligenceChat(merchantSlug);
  const [input, setInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const topCampaigns = [...intelligence.campaigns]
    .sort((a, b) => b.estimatedRevenueLiftCents - a.estimatedRevenueLiftCents)
    .slice(0, 4);

  const topAutomations = [...intelligence.automations]
    .sort((a, b) => b.estimatedMonthlyLiftCents - a.estimatedMonthlyLiftCents)
    .slice(0, 4);

  const topPromos = [...intelligence.promos]
    .sort((a, b) => b.netLiftCents - a.netLiftCents)
    .slice(0, 4);

  const quickWins: InsightCard[] = [
    ...topCampaigns
      .filter((c) => c.status !== "active")
      .slice(0, 2)
      .map(
        (c): InsightCard => ({
          id: `c-${c.id}`,
          icon: "campaign",
          title: c.name,
          meta: `${c.channel} · ${c.status}`,
          lift: `+${money(symbol, c.estimatedRevenueLiftCents)}`,
          tip: c.recommendation,
          priority: c.confidence === "high" ? "high" : "medium",
        }),
      ),
    ...topAutomations
      .filter((a) => !a.enabled)
      .slice(0, 2)
      .map(
        (a): InsightCard => ({
          id: `a-${a.ruleKey}`,
          icon: "bolt",
          title: a.title,
          meta: "Automation · off",
          lift: `~${money(symbol, a.estimatedMonthlyLiftCents)}/mo`,
          tip: a.recommendation,
          priority: "high",
        }),
      ),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden border border-primary/25 bg-gradient-to-br from-surface-container-low to-surface-container-lowest">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
              <Icon name="psychology" className="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-headline-sm text-primary">Ask AI</p>
              <p className="truncate text-[11px] text-on-surface-variant">
                {configured === null
                  ? "Checking AI…"
                  : configured
                    ? "Recommendations & investigations · your store data only"
                    : "Rule-based · add DEEPSEEK_API_KEY for full AI"}
              </p>
            </div>
          </div>
          <Icon name={chatOpen ? "expand_less" : "expand_more"} className="shrink-0 text-primary" />
        </button>

        {chatOpen && (
          <div className="border-t border-primary/15">
            {messages.length === 0 && !loading ? (
              <div className="px-4 py-4 sm:px-6">
                <p className="text-body-md text-on-surface-variant">
                  Ask for recommendations or investigations — campaigns, pricing, holidays, trends.
                  Answers use only this merchant&apos;s Reports data.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {REPORTS_CHAT_STARTERS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="rounded-lg border border-surface-container-highest bg-surface-container-lowest px-3 py-2.5 text-left text-body-md transition-colors hover:border-primary/30"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-h-64 space-y-4 overflow-y-auto px-4 py-4 sm:max-h-80 sm:px-6">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={`u-${i}`} className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary/10 px-3 py-2 text-body-md">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={`a-${i}`} className="flex gap-2">
                      <Icon name="psychology" className="mt-1 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1 text-body-md">
                        <ChatMarkdown content={m.content} />
                      </div>
                    </div>
                  ),
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:300ms]" />
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-primary/15 bg-surface-container-lowest p-3 sm:flex-row sm:items-end sm:px-4">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="shrink-0 self-start px-2 py-1 text-[11px] text-on-surface-variant hover:text-primary sm:self-auto"
                >
                  Clear
                </button>
              )}
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
                rows={1}
                placeholder="e.g. Which campaign should I run before Hari Raya?"
                className="min-h-[2.5rem] flex-1 resize-none border border-surface-container-highest bg-surface px-3 py-2 text-body-md outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading || !input.trim()}
                className="flex shrink-0 items-center justify-center gap-2 bg-primary px-4 py-2.5 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
              >
                <Icon name="send" />
                Ask
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="border border-primary/20 bg-surface-container-low p-4 sm:p-6">
        <h2 className="font-display text-headline-sm text-primary">Executive summary</h2>
        <p className="mt-3 text-body-md leading-relaxed">{intelligence.summary.replace(/\*\*/g, "")}</p>
      </section>

      {quickWins.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-headline-sm text-primary">Quick wins</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickWins.map((item) => (
              <div
                key={item.id}
                className={`border border-surface-container-highest bg-surface-container-lowest p-4 ${priorityStyles(item.priority)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon name={item.icon} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-headline-sm text-primary">{item.title}</p>
                      <p className="text-[11px] text-on-surface-variant">{item.meta}</p>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-label-mono text-primary">{item.lift}</p>
                </div>
                <p className="mt-2 text-body-md text-on-surface-variant">{item.tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightList
          title="Campaigns"
          icon="campaign"
          empty="No campaigns yet"
          items={topCampaigns.map((c) => ({
            id: c.id,
            name: c.name,
            meta: `${c.channel} · ${c.status} · reach ${c.reachCount}`,
            lift: `+${money(symbol, c.estimatedRevenueLiftCents)} (${c.estimatedLiftPct}%)`,
            tip: c.recommendation,
            active: c.status === "active",
          }))}
        />
        <InsightList
          title="Promo codes"
          icon="sell"
          empty="No promos yet"
          items={topPromos.map((p) => ({
            id: p.id,
            name: p.code ? `${p.name} (${p.code})` : p.name,
            meta: `${p.redemptionCount} redemptions`,
            lift: money(symbol, p.netLiftCents),
            tip: p.recommendation,
          }))}
        />
        <InsightList
          title="Automations"
          icon="bolt"
          empty="No automations"
          items={topAutomations.map((a) => ({
            id: a.ruleKey,
            name: a.title,
            meta: a.enabled ? "Enabled" : "Disabled",
            lift: `~${money(symbol, a.estimatedMonthlyLiftCents)}/mo`,
            tip: a.recommendation,
          }))}
        />
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-headline-sm text-primary">
            <Icon name="event" />
            Upcoming holidays
          </h2>
          {intelligence.holidays.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No public holidays in the next 90 days.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {intelligence.holidays.slice(0, 4).map((h) => (
                <div key={h.holiday.date} className="border border-surface-container-highest p-3">
                  <p className="font-display text-headline-sm text-primary">{h.holiday.localName}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {h.holiday.date} · {pctBadge(h.projectedLiftPct)} · ~{money(symbol, h.projectedRevenueCents)}/day
                  </p>
                  <p className="mt-1 text-body-md">{h.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-headline-sm text-primary">
          <Icon name="trending_up" />
          Price change scenarios
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {intelligence.priceScenarios.slice(0, 8).map((s, i) => (
            <div key={`${s.scope}-${s.label}-${i}`} className="border border-surface-container-highest p-3">
              <p className="text-[10px] font-mono uppercase text-on-surface-variant">
                {s.scope} · {s.label}
              </p>
              <p className="mt-1 font-mono text-label-mono text-primary">+{s.changePercent}%</p>
              <p className="mt-1 text-[11px]">
                {s.projectedRevenueDeltaCents >= 0 ? "+" : ""}
                {money(symbol, s.projectedRevenueDeltaCents)}/mo
              </p>
              <p className="text-[10px] text-on-surface-variant">Orders {s.projectedOrderChangePct}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InsightList({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: string;
  empty: string;
  items: { id: string; name: string; meta: string; lift: string; tip: string; active?: boolean }[];
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-headline-sm text-primary">
        <Icon name={icon} />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`border p-3 ${
                item.active
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-surface-container-highest"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-headline-sm text-primary">{item.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{item.meta}</p>
                </div>
                <p className="shrink-0 font-mono text-[11px] text-primary">{item.lift}</p>
              </div>
              <p className="mt-1 text-body-md text-on-surface-variant">{item.tip}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
