"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { printElement } from "@/lib/print/browser-print";

type ReceiptPrintActionsProps = {
  receiptElementId: string;
  onSend?: (input: { method: "email" | "whatsapp"; destination: string }) => Promise<void>;
  sentAt?: string | null;
  compact?: boolean;
};

export function ReceiptPrintActions({
  receiptElementId,
  onSend,
  sentAt,
  compact = false,
}: ReceiptPrintActionsProps) {
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [destination, setDestination] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSentAt, setLocalSentAt] = useState<string | null>(sentAt ?? null);

  useEffect(() => {
    setLocalSentAt(sentAt ?? null);
  }, [sentAt]);

  async function handleSend() {
    if (!onSend || !destination.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend({ method, destination: destination.trim() });
      setLocalSentAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send receipt");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "border border-surface-container-highest bg-surface-container-lowest p-4"}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => printElement(receiptElementId)}
          className="inline-flex items-center gap-2 border border-primary px-4 py-2.5 font-display text-eyebrow uppercase text-primary hover:bg-primary/5"
        >
          <Icon name="print" />
          Print receipt
        </button>
      </div>

      {onSend && (
        <div className="border-t border-surface-container-highest pt-3">
          <p className="font-display text-eyebrow uppercase text-on-surface-variant">
            Send receipt to customer
          </p>
          {localSentAt && (
            <p className="mt-1 text-body-md text-emerald-700">
              Sent {new Date(localSentAt).toLocaleString()}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(["email", "whatsapp"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMethod(option)}
                className={`px-3 py-1.5 font-mono text-label-mono uppercase ${
                  method === option ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {option === "email" ? "Email" : "WhatsApp"}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type={method === "email" ? "email" : "tel"}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === "email" ? "customer@email.com" : "+60 12 345 6789"}
              className="min-w-0 flex-1 border border-surface-container-highest px-3 py-2 text-body-md"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !destination.trim()}
              className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-2.5 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
            >
              <Icon name="send" />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-body-md text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
