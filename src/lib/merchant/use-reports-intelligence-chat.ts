"use client";

import { useCallback, useEffect, useState } from "react";
import { merchantApi } from "@/lib/merchant/fetch";
import { REPORTS_CHAT_STARTERS } from "@/lib/ai/reports-intelligence";

export type ReportsChatMessage = { role: "user" | "assistant"; content: string };

export { REPORTS_CHAT_STARTERS };

export function useReportsIntelligenceChat(merchantSlug: string) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ReportsChatMessage[]>([]);
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

      const userMsg: ReportsChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await merchantApi<{
          reply: string;
          source: string;
          deepseekConfigured: boolean;
        }>(`/api/merchant/${merchantSlug}/reports/intelligence/ask`, {
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
            content: err instanceof Error ? err.message : "Something went wrong. Try again.",
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
