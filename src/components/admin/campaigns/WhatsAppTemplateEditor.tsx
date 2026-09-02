"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BannerImageEditor } from "@/components/admin/BannerImageEditor";
import { MetaReadinessChecklist } from "@/components/admin/campaigns/MetaReadinessChecklist";
import { labelClass, WorkflowToggle } from "@/components/admin/campaigns/visual-editor-parts";
import { Icon } from "@/components/ui/Icon";
import {
  CAMPAIGN_PLACEHOLDERS,
  insertAtCursor,
  MESSAGE_CHAR_LIMIT,
  MESSAGE_SOFT_LIMIT,
} from "@/lib/campaigns/message-spec";
import {
  WHATSAPP_FOOTER_LIMIT,
  WHATSAPP_MAX_BUTTONS,
  whatsAppCompliance,
  type WhatsAppButton,
  type WhatsAppButtonType,
  type WhatsAppTemplate,
} from "@/lib/campaigns/workflow-spec";
import { merchantApi } from "@/lib/merchant/fetch";

const BUTTON_TYPES: { value: WhatsAppButtonType; label: string; valueLabel: string; placeholder: string }[] = [
  { value: "quick_reply", label: "Quick reply", valueLabel: "Reply keyword", placeholder: "YES" },
  { value: "url", label: "Visit website", valueLabel: "Link", placeholder: "https://" },
  { value: "phone", label: "Call us", valueLabel: "Phone number", placeholder: "+60123456789" },
];

const fieldClass =
  "w-full rounded-md border border-outline-variant/70 bg-white px-3 py-2 text-[13px] outline-none focus:border-on-surface";

export function WhatsAppTemplateEditor({
  merchantSlug,
  merchantName,
  template,
  onChange,
}: {
  merchantSlug: string;
  merchantName?: string;
  template: WhatsAppTemplate;
  onChange: (patch: Partial<WhatsAppTemplate>) => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const compliance = useMemo(() => whatsAppCompliance(template, merchantName), [template, merchantName]);
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  async function draftWithAi() {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setAiNote(null);
    try {
      const result = await merchantApi<{ messageBody?: string; rationale?: string; source?: string }>(
        `/api/merchant/${merchantSlug}/ai/campaign`,
        {
          method: "POST",
          body: JSON.stringify({ type: "campaign", channel: "whatsapp", goal: aiGoal.trim() }),
        },
      );
      if (result.messageBody) {
        // The template's own toggle appends the opt-out line; keep it out of the body.
        onChange({ body: result.messageBody.replace(/\s*Reply STOP to opt out\.?\s*$/i, "").trim() });
      }
      setAiNote(
        result.rationale ??
          (result.source === "template" ? "Used a stock template — set DEEPSEEK_API_KEY for AI drafts." : "Draft applied."),
      );
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiLoading(false);
    }
  }

  const charCount = template.body.length;
  const overSoft = charCount > MESSAGE_SOFT_LIMIT.whatsapp;
  const overHard = charCount > MESSAGE_CHAR_LIMIT.whatsapp;

  const insertToken = useCallback(
    (token: string) => {
      const el = bodyRef.current;
      if (!el) {
        onChange({ body: template.body + token });
        return;
      }
      const { next, cursor } = insertAtCursor(
        template.body,
        token,
        el.selectionStart,
        el.selectionEnd,
      );
      onChange({ body: next });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [onChange, template.body],
  );

  function updateButton(id: string, patch: Partial<WhatsAppButton>) {
    onChange({
      buttons: template.buttons.map((button) =>
        button.id === id ? { ...button, ...patch } : button,
      ),
    });
  }

  function addButton() {
    if (template.buttons.length >= WHATSAPP_MAX_BUTTONS) return;
    onChange({
      buttons: [
        ...template.buttons,
        {
          id: `btn-${Date.now().toString(36)}`,
          type: "quick_reply",
          label: "",
          value: "",
        },
      ],
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <p className={labelClass}>Header</p>
        <div className="mt-2 flex gap-1.5">
          {(["none", "text", "image"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ headerType: type })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] capitalize transition-colors ${
                template.headerType === type
                  ? "border-on-surface bg-on-surface text-white"
                  : "border-outline-variant/70 bg-white text-on-surface-variant hover:border-on-surface/40"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {template.headerType === "text" && (
          <input
            value={template.headerText}
            onChange={(e) => onChange({ headerText: e.target.value })}
            placeholder="Weekend special"
            maxLength={60}
            className={`mt-2 ${fieldClass}`}
          />
        )}

        {template.headerType === "image" && (
          <div className="mt-2">
            <BannerImageEditor
              merchantSlug={merchantSlug}
              value={template.headerImageUrl}
              onChange={(url) => onChange({ headerImageUrl: url })}
              compact
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={labelClass}>Message body</p>
          <span
            className={`font-mono text-[10px] ${
              overHard ? "text-red-700" : overSoft ? "text-amber-700" : "text-on-surface-variant"
            }`}
          >
            {charCount}/{MESSAGE_CHAR_LIMIT.whatsapp}
          </span>
        </div>
        <textarea
          ref={bodyRef}
          value={template.body}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={6}
          placeholder="Hi {name}, welcome to {merchant}! Show this message on your next visit for a thank-you treat."
          className={`${fieldClass} font-mono leading-relaxed`}
        />
        <div className="mt-2 flex gap-1.5">
          <input
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            disabled={aiLoading}
            placeholder="Draft with AI — e.g. weekend latte promo for regulars"
            className={`${fieldClass} min-w-0 flex-1 text-[12px]`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void draftWithAi();
              }
            }}
          />
          <button
            type="button"
            onClick={draftWithAi}
            disabled={aiLoading || !aiGoal.trim()}
            className="flex shrink-0 items-center gap-1 rounded-md border border-outline-variant/70 bg-white px-2.5 text-[11px] text-on-surface hover:border-on-surface/50 disabled:opacity-40"
            title="Let the AI assistant write a first draft"
          >
            <Icon name="auto_awesome" className="text-[14px]" />
            {aiLoading ? "Drafting…" : "Draft"}
          </button>
        </div>
        {aiNote && <p className="mt-1.5 text-[11px] text-on-surface-variant">{aiNote}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CAMPAIGN_PLACEHOLDERS.map((placeholder) => (
            <button
              key={placeholder.token}
              type="button"
              onClick={() => insertToken(placeholder.token)}
              title={`${placeholder.label} — e.g. ${placeholder.example}`}
              className="rounded border border-outline-variant/70 bg-surface-container-low px-2 py-0.5 font-mono text-[10px] text-on-surface hover:border-on-surface/50"
            >
              {placeholder.token}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={labelClass}>Footer</p>
          <span
            className={`font-mono text-[10px] ${
              template.footer.length > WHATSAPP_FOOTER_LIMIT
                ? "text-red-700"
                : "text-on-surface-variant"
            }`}
          >
            {template.footer.length}/{WHATSAPP_FOOTER_LIMIT}
          </span>
        </div>
        <input
          value={template.footer}
          onChange={(e) => onChange({ footer: e.target.value })}
          placeholder="Valid until Sunday"
          className={fieldClass}
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={labelClass}>Buttons</p>
          <span className="font-mono text-[10px] text-on-surface-variant">
            {template.buttons.length}/{WHATSAPP_MAX_BUTTONS}
          </span>
        </div>

        <div className="space-y-2">
          {template.buttons.map((button) => {
            const spec = BUTTON_TYPES.find((t) => t.value === button.type) ?? BUTTON_TYPES[0];
            return (
              <div
                key={button.id}
                className="rounded-md border border-outline-variant/70 bg-surface-container-low p-2.5"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={button.type}
                    onChange={(e) =>
                      updateButton(button.id, { type: e.target.value as WhatsAppButtonType })
                    }
                    className="flex-1 rounded border border-outline-variant/70 bg-white px-2 py-1 text-[11px] outline-none"
                  >
                    {BUTTON_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Remove button"
                    onClick={() =>
                      onChange({ buttons: template.buttons.filter((b) => b.id !== button.id) })
                    }
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-outline-variant/60 bg-white text-on-surface-variant hover:border-red-300 hover:text-red-700"
                  >
                    <Icon name="close" className="text-[13px]" />
                  </button>
                </div>
                <input
                  value={button.label}
                  onChange={(e) => updateButton(button.id, { label: e.target.value })}
                  placeholder="Button label"
                  maxLength={20}
                  className={`mt-2 ${fieldClass}`}
                />
                <input
                  value={button.value}
                  onChange={(e) => updateButton(button.id, { value: e.target.value })}
                  placeholder={spec.placeholder}
                  aria-label={spec.valueLabel}
                  className={`mt-1.5 ${fieldClass}`}
                />
              </div>
            );
          })}
        </div>

        {template.buttons.length < WHATSAPP_MAX_BUTTONS && (
          <button
            type="button"
            onClick={addButton}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-outline-variant px-3 py-2 text-[11px] text-on-surface-variant hover:border-on-surface/40 hover:text-on-surface"
          >
            <Icon name="add" className="text-[14px]" />
            Add button
          </button>
        )}
      </section>

      <div className="rounded-md border border-outline-variant/70 bg-surface-container-low p-3">
        <WorkflowToggle
          label="Include opt-out line"
          help="Appends “Reply STOP to opt out.” — required for PDPA marketing messages."
          enabled={template.includeOptOut}
          onChange={(includeOptOut) => onChange({ includeOptOut })}
        />
      </div>

      <div className="rounded-md border border-outline-variant/70 bg-surface-container-low p-3">
        <MetaReadinessChecklist report={compliance} compact />
      </div>
    </div>
  );
}
