"use client";

import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChatMarkdown } from "@/components/ui/ChatMarkdown";
import { Icon } from "@/components/ui/Icon";
import {
  AGENT_CHAT_STARTERS,
  useMerchantAgentChat,
} from "@/lib/merchant/use-merchant-agent-chat";

type AssistantAdminShellProps = { merchantSlug: string };

export function AssistantAdminShell({ merchantSlug }: AssistantAdminShellProps) {
  const { configured, messages, loading, send, clearChat } =
    useMerchantAgentChat(merchantSlug);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function handleSubmit() {
    const ok = await send(input);
    if (ok) setInput("");
  }

  const empty = messages.length === 0 && !loading;

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="assistant"
      title="AI Assistant"
      eyebrow="iRewards setup agent"
      layout="viewport"
      hideHeader
      headerAction={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-2 border border-surface-container-highest px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Icon name="add" className="text-lg" />
            New chat
          </button>
        ) : undefined
      }
    >
      <div className="flex h-full min-h-0 flex-col bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-container-highest bg-surface-container-lowest px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">
              <Icon name="smart_toy" className="text-xl" />
            </div>
            <div>
              <p className="font-display text-headline-sm text-primary">Setup agent</p>
              <p className="text-[11px] text-on-surface-variant">
                {configured === null
                  ? "Checking AI…"
                  : configured
                    ? "DeepSeek · points, tiers & redemption"
                    : "Rule-based · add DEEPSEEK_API_KEY for full AI"}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 text-body-md text-on-surface-variant transition-colors hover:text-primary md:hidden"
            >
              <Icon name="add" className="text-lg" />
              New
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-surface-container-highest bg-surface-container-lowest shadow-sm">
                <Icon name="smart_toy" className="text-4xl text-primary" />
              </div>
              <h2 className="text-center font-display text-headline-md text-primary">
                What can I help you set up?
              </h2>
              <p className="mt-2 max-w-md text-center text-body-md text-on-surface-variant">
                Ask about earn rates, tier multipliers, Monday double points, redemption caps,
                or run calculations with your live program settings.
              </p>
              <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {AGENT_CHAT_STARTERS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-xl border border-surface-container-highest bg-surface-container-lowest px-4 py-3 text-left text-body-md text-on-surface transition-colors hover:border-primary/30 hover:bg-surface-container-low"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={`${m.role}-${i}`} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-container-high px-4 py-3 text-body-md text-on-surface">
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={`${m.role}-${i}`} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Icon name="smart_toy" className="text-lg" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="mb-1 font-display text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Setup agent
                      </p>
                      <ChatMarkdown content={m.content} />
                    </div>
                  </div>
                ),
              )}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Icon name="smart_toy" className="text-lg" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-surface-container-highest bg-surface-container-lowest px-4 py-4 md:px-6">
          <form
            className="mx-auto w-full max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-surface-container-highest bg-surface px-3 py-2 shadow-sm focus-within:border-primary/40">
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
                placeholder="Ask about points setup, tiers, or redemption…"
                rows={1}
                disabled={loading}
                className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-body-md outline-none placeholder:text-on-surface-variant/70"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-opacity disabled:opacity-40"
                aria-label="Send message"
              >
                <Icon name="arrow_upward" className="text-xl" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-on-surface-variant">
              Answers use your live merchant config · Shift+Enter for new line
            </p>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
