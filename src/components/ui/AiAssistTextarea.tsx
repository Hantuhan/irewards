"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type AiAssistTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  merchantSlug: string;
  policyType: "refund" | "privacy";
  defaultText?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function AiAssistTextarea({
  value,
  onChange,
  merchantSlug,
  policyType,
  defaultText,
  placeholder,
  rows = 8,
  className = "",
}: AiAssistTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const prompt = value.trim();
      const response = await fetch(`/api/merchant/${merchantSlug}/ai/legal-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          policyType,
          prompt,
          existingText: prompt || undefined,
        }),
      });
      const json = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "AI generation failed");
      onChange(json.text ?? "");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        {defaultText && (
          <button
            type="button"
            onClick={() => onChange(defaultText)}
            disabled={generating}
            className="font-mono text-label-mono text-on-surface-variant underline hover:text-primary disabled:opacity-50"
          >
            Restore default
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="flex items-center gap-2 border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
        >
          <Icon name="auto_awesome" className={generating ? "animate-pulse" : ""} />
          {generating ? "Generating…" : "Generate with AI"}
        </button>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={generating}
          className={`w-full resize-y border border-surface-container-highest px-3 py-2 outline-none focus:border-primary disabled:opacity-60 ${className}`}
        />
        {generating && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-container-lowest/80">
            <span className="flex items-center gap-2 font-mono text-label-mono text-primary">
              <Icon name="auto_awesome" className="animate-pulse" />
              Writing with AI…
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Type a few words describing your policy (optional), then click{" "}
        <span className="text-primary">Generate with AI</span> to draft the full text.
      </p>
      {error && (
        <p className="mt-1 text-body-md text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
