"use client";

import { useEffect, useRef, useState } from "react";
import { MetaReadinessChecklist } from "@/components/admin/campaigns/MetaReadinessChecklist";
import { WhatsAppPhonePreview } from "@/components/admin/campaigns/campaign-review-parts";
import { labelClass } from "@/components/admin/campaigns/visual-editor-parts";
import { ChatMarkdown } from "@/components/ui/ChatMarkdown";
import { Icon } from "@/components/ui/Icon";
import type {
  ComposerPlan,
  ComposerQuestion,
  ComposerResult,
  ComposerTurn,
} from "@/lib/ai/campaign-composer";
import { campaignChannelLabel } from "@/lib/campaigns/channels";
import { nodeSummary, WORKFLOW_CAPABILITY_SUMMARY } from "@/lib/campaigns/workflow-spec";
import { merchantApi } from "@/lib/merchant/fetch";

const STARTERS = [
  "Win back members who haven't visited in 30 days with 20% off",
  "Welcome new members an hour after their first visit",
  "Ask for a Google review 24 hours after payment",
  "Weekend promo photo on the table menu (Sat–Sun only)",
];

type CampaignComposerViewProps = {
  merchantSlug: string;
  merchantName: string;
  /** Opens the plan in the workflow builder as an unsaved draft. */
  onOpenInBuilder: (plan: ComposerPlan) => void;
  onCancel: () => void;
};

/**
 * "Describe it": chat on the left, the plan taking shape on the right.
 * Nothing is saved here — the builder's Confirm creates the campaign.
 */
export function CampaignComposerView({
  merchantSlug,
  merchantName,
  onOpenInBuilder,
  onCancel,
}: CampaignComposerViewProps) {
  const [turns, setTurns] = useState<ComposerTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [guided, setGuided] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const lastTurn = turns[turns.length - 1];
  const pendingQuestions: ComposerQuestion[] =
    lastTurn?.role === "assistant" && lastTurn.questions?.length ? lastTurn.questions : [];
  const plan = [...turns].reverse().find((t) => t.plan)?.plan ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setAnswers({});
    const history = turns;
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const result = await merchantApi<ComposerResult & { deepseekConfigured: boolean }>(
        `/api/merchant/${merchantSlug}/ai/campaign-composer`,
        { method: "POST", body: JSON.stringify({ message: trimmed, history }) },
      );
      setGuided(!result.deepseekConfigured);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, plan: result.plan, questions: result.questions },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The planner did not answer. Try again.");
      setTurns((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  function sendAnswers(useBestGuess: boolean) {
    const lines = pendingQuestions
      .filter((q) => answers[q.id])
      .map((q) => `${q.prompt} ${answers[q.id]}`);
    if (useBestGuess || lines.length < pendingQuestions.length) {
      lines.push("Use your best guess for anything I didn't answer.");
    }
    void send(lines.join("\n"));
  }

  function restart() {
    setTurns([]);
    setAnswers({});
    setError(null);
    setInput("");
  }

  const answeredCount = pendingQuestions.filter((q) => answers[q.id]).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* ---- conversation ------------------------------------------------ */}
      <section className="flex min-h-[520px] flex-col border border-surface-container-highest bg-surface-container-lowest">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {turns.length === 0 && (
            <div>
              <p className="font-display text-headline-sm text-primary">What should this campaign do?</p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                One sentence is enough — who to reach, when, and what they get. I’ll suggest a draft
                workflow from the steps below; you open it in the builder to edit and save.
              </p>
              <details className="mt-3 rounded-lg border border-surface-container-highest bg-surface-container-low px-3 py-2 text-[11px] text-on-surface-variant">
                <summary className="cursor-pointer font-medium text-on-surface">
                  Steps I can use (When → Only if → Then)
                </summary>
                <dl className="mt-2 space-y-1.5">
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-primary">When</dt>
                    <dd>{WORKFLOW_CAPABILITY_SUMMARY.triggers.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-primary">Only if</dt>
                    <dd>{WORKFLOW_CAPABILITY_SUMMARY.conditions.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-primary">Then</dt>
                    <dd>{WORKFLOW_CAPABILITY_SUMMARY.actions.join(" · ")}</dd>
                  </div>
                </dl>
              </details>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void send(starter)}
                    className="rounded-full border border-surface-container-highest bg-surface-container-low px-3 py-1.5 text-left text-[12px] text-on-surface hover:border-primary hover:text-primary"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, index) => (
            <div key={index} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  turn.role === "user"
                    ? "bg-primary text-on-primary"
                    : "border border-surface-container-highest bg-white text-on-surface"
                }`}
              >
                {turn.role === "user" ? (
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                ) : (
                  <ChatMarkdown content={turn.content} />
                )}
              </div>
            </div>
          ))}

          {pendingQuestions.length > 0 && !loading && (
            <div className="space-y-4 rounded-xl border border-primary/30 bg-surface-container-low p-4">
              {pendingQuestions.map((question) => (
                <div key={question.id}>
                  <p className="text-[13px] font-medium text-on-surface">{question.prompt}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [question.id]: selected ? "" : option }))
                          }
                          className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                            selected
                              ? "border-primary bg-primary text-on-primary"
                              : "border-surface-container-highest bg-white text-on-surface hover:border-primary"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => sendAnswers(false)}
                  disabled={answeredCount === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1a3d2e] px-4 font-mono text-[11px] uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-40"
                >
                  Continue
                  <Icon name="arrow_forward" className="text-[14px]" />
                </button>
                <button
                  type="button"
                  onClick={() => sendAnswers(true)}
                  className="h-9 rounded-lg border border-surface-container-highest bg-white px-3 text-[12px] text-on-surface-variant hover:text-primary"
                >
                  Use your best guess
                </button>
                <span className="text-[11px] text-on-surface-variant">or type your own answer below</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
              <Icon name="auto_awesome" className="animate-pulse text-base text-primary" />
              Planning…
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 border-t border-surface-container-highest p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            disabled={loading}
            placeholder={
              plan
                ? "Change something — e.g. “make it 15% and only for Gold members”"
                : "Describe the campaign…"
            }
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-[13px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            <Icon name="send" className="text-lg" />
          </button>
        </form>
        {guided && (
          <p className="border-t border-surface-container-highest px-4 py-2 text-[11px] text-on-surface-variant">
            Guided mode — the planner is matching your brief to built-in journeys. Add
            <code className="mx-1 font-mono">DEEPSEEK_API_KEY</code> for free-form planning.
          </p>
        )}
      </section>

      {/* ---- plan --------------------------------------------------------- */}
      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="border border-surface-container-highest bg-surface-container-lowest p-5">
          <p className={labelClass}>Suggested draft</p>
          {!plan ? (
            <p className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
              Your draft appears here as we go — when it runs, who it reaches, what they get. Nothing
              is saved until you open the builder and confirm.
            </p>
          ) : (
            <>
              <h3 className="mt-2 font-display text-headline-sm text-primary">{plan.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded border border-surface-container-highest px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                  {campaignChannelLabel(plan.channel)}
                </span>
                <span className="rounded border border-surface-container-highest px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                  {plan.goal}
                </span>
              </div>
              {plan.summary && (
                <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant">{plan.summary}</p>
              )}

              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">When</dt>
                  <dd className="text-on-surface">{nodeSummary(plan.workflow.trigger)}</dd>
                </div>
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Only if</dt>
                  <dd className="text-on-surface">
                    {plan.workflow.conditions.length
                      ? plan.workflow.conditions.map(nodeSummary).join(" and ")
                      : "Everyone"}
                  </dd>
                </div>
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">Then</dt>
                  <dd className="text-on-surface">
                    {plan.workflow.actions.map(nodeSummary).join(" → ") || "—"}
                  </dd>
                </div>
              </dl>

              {plan.autoFixes.length > 0 && (
                <p className="mt-3 text-[11px] text-on-surface-variant">
                  <Icon name="build" className="mr-1 align-[-2px] text-[13px]" />
                  Auto-fixed: {plan.autoFixes.join(" · ")}
                </p>
              )}

              {plan.workflowIssues.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-amber-800">
                  {plan.workflowIssues.map((issue) => (
                    <li key={issue} className="flex items-start gap-1.5">
                      <Icon name="warning" className="mt-px text-[13px]" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenInBuilder(plan)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1a3d2e] px-4 font-mono text-[11px] uppercase tracking-wider text-white hover:opacity-90"
                >
                  Open in builder
                  <Icon name="arrow_forward" className="text-[14px]" />
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="h-9 rounded-lg border border-surface-container-highest bg-white text-[12px] text-on-surface-variant hover:text-primary"
                >
                  Start over
                </button>
              </div>
            </>
          )}
        </div>

        {plan?.compliance && <MetaReadinessChecklist report={plan.compliance} />}

        {plan && plan.channel !== "banner" && plan.messagePreview && (
          <div className="border border-surface-container-highest bg-surface-container-lowest p-5">
            <WhatsAppPhonePreview
              merchantName={merchantName}
              messageBody={plan.messagePreview}
              channel="whatsapp"
              title="Message preview"
            />
          </div>
        )}

        {plan && plan.channel === "banner" && (
          <div className="border border-surface-container-highest bg-surface-container-lowest p-5">
            <p className={labelClass}>Banner preview</p>
            {(() => {
              const banner = plan.workflow.actions.find((a) => a.type === "show_banner");
              const title = String(banner?.config.title ?? "");
              const text = String(banner?.config.text ?? "");
              return (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                  <p className="font-display text-[14px] font-semibold text-primary">{title || "Headline"}</p>
                  {text && <p className="mt-1 text-[12px] text-on-surface-variant">{text}</p>}
                </div>
              );
            })()}
          </div>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="text-body-md text-on-surface-variant underline-offset-2 hover:text-primary hover:underline"
        >
          ← Back to overview
        </button>
      </aside>
    </div>
  );
}
