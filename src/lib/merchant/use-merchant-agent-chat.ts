"use client";

import { useCallback, useEffect, useState } from "react";
import { merchantApi } from "@/lib/merchant/fetch";

export type AgentChatMessage = { role: "user" | "assistant"; content: string };

export const AGENT_CHAT_STARTERS = [
  "How do members earn points?",
  "Explain point redemption at checkout",
  "How does Monday double points work?",
  "Calculate earn for RM 50 on Gold tier",
  "What earn rate should I use for F&B?",
  "How do tier multipliers work?",
];

export function useMerchantAgentChat(merchantSlug: string) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    merchantApi<{ configured: boolean }>(`/api/merchant/${merchantSlug}/ai/status`)
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, [merchantSlug]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return false;

      const userMsg: AgentChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await merchantApi<{
          reply: string;
          source: string;
          deepseekConfigured: boolean;
        }>(`/api/merchant/${merchantSlug}/ai/chat`, {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            history: messages,
          }),
        });
        setConfigured(res.deepseekConfigured);
        setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
        return true;
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              err instanceof Error ? err.message : "Something went wrong. Try again.",
          },
        ]);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loading, merchantSlug, messages],
  );

  return { configured, messages, loading, send, clearChat };
}
