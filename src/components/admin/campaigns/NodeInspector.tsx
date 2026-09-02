"use client";

import { BannerImageEditor } from "@/components/admin/BannerImageEditor";
import { labelClass, WorkflowToggle } from "@/components/admin/campaigns/visual-editor-parts";
import { WhatsAppTemplateEditor } from "@/components/admin/campaigns/WhatsAppTemplateEditor";
import { Icon } from "@/components/ui/Icon";
import {
  asWhatsAppTemplate,
  findNodeDefinition,
  type CampaignNode,
  type FieldSpec,
  type NodeConfig,
  type NodeDefinition,
  type WhatsAppTemplate,
} from "@/lib/campaigns/workflow-spec";

const fieldClass =
  "w-full rounded-md border border-outline-variant/70 bg-white px-3 py-2 text-[13px] outline-none focus:border-on-surface";

export function NodeInspector({
  node,
  merchantSlug,
  merchantName,
  currency,
  tierOptions,
  onConfigChange,
  typeOptions = [],
  onTypeChange,
}: {
  node: CampaignNode | null;
  merchantSlug: string;
  /** Lets the Meta checklist recognise the cafe's own name in the copy. */
  merchantName?: string;
  currency: string;
  tierOptions: { value: string; label: string }[];
  onConfigChange: (patch: NodeConfig) => void;
  /** Same-kind steps this one can be swapped for (already filtered for the channel). */
  typeOptions?: NodeDefinition[];
  onTypeChange?: (type: string) => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <Icon name="tune" className="text-3xl text-outline-variant" />
        <p className="mt-3 text-[12px] text-on-surface-variant">
          Tap any step on the canvas to change it.
        </p>
        <ol className="mt-4 space-y-1.5 text-left text-[11px] text-on-surface-variant">
          <li>1. <span className="text-on-surface">When</span> — what starts the campaign</li>
          <li>2. <span className="text-on-surface">Only if</span> — optional checks on the member</li>
          <li>3. <span className="text-on-surface">Then</span> — the message, points or voucher</li>
        </ol>
      </div>
    );
  }

  const definition = findNodeDefinition(node.type);
  if (!definition) {
    return <p className="p-4 text-[12px] text-on-surface-variant">Unknown step “{node.type}”.</p>;
  }

  return (
    <div className="space-y-4">
      <header className="border-b border-outline-variant/50 pb-3">
        <span className={`flex items-center gap-1.5 ${labelClass}`}>
          <Icon name={definition.icon} className="text-[13px]" />
          {definition.kind}
        </span>
        <h3 className="mt-1.5 font-display text-[16px] font-medium text-on-surface">
          {definition.label}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-on-surface-variant">
          {definition.description}
        </p>
      </header>

      {onTypeChange && typeOptions.length > 1 && (
        <label className="block">
          <span className={labelClass}>
            {definition.kind === "condition" ? "Check" : definition.kind === "trigger" ? "When" : "Do"}
          </span>
          <select
            value={definition.type}
            onChange={(e) => onTypeChange(e.target.value)}
            className={`mt-1.5 ${fieldClass}`}
          >
            {typeOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-snug text-on-surface-variant">
            Swaps this step for another {definition.kind} in the same position.
          </span>
        </label>
      )}

      {definition.fields.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant">
          This {definition.kind} has no settings — it simply {definition.kind === "condition" ? "passes or fails" : "runs"}.
          {onTypeChange && typeOptions.length > 1 ? " Pick a different one above to check something else." : ""}
        </p>
      ) : (
        definition.fields.map((field) => (
          <NodeField
            key={field.key}
            field={field}
            value={node.config[field.key]}
            merchantSlug={merchantSlug}
            merchantName={merchantName}
            currency={currency}
            tierOptions={tierOptions}
            onChange={(value) => onConfigChange({ [field.key]: value })}
          />
        ))
      )}
    </div>
  );
}

function NodeField({
  field,
  value,
  merchantSlug,
  merchantName,
  currency,
  tierOptions,
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  merchantSlug: string;
  merchantName?: string;
  currency: string;
  tierOptions: { value: string; label: string }[];
  onChange: (value: unknown) => void;
}) {
  if (field.type === "whatsapp_template") {
    return (
      <WhatsAppTemplateEditor
        merchantSlug={merchantSlug}
        merchantName={merchantName}
        template={asWhatsAppTemplate(value)}
        onChange={(patch: Partial<WhatsAppTemplate>) =>
          onChange({ ...asWhatsAppTemplate(value), ...patch })
        }
      />
    );
  }

  if (field.type === "toggle") {
    return (
      <div className="rounded-md border border-outline-variant/70 bg-surface-container-low p-3">
        <WorkflowToggle
          label={field.label}
          help={field.help}
          enabled={value !== false}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <label className="block">
      <span className={labelClass}>{field.label}</span>

      {field.type === "text" && (
        <input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`mt-1.5 ${fieldClass}`}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          className={`mt-1.5 ${fieldClass}`}
        />
      )}

      {field.type === "number" && (
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            value={Number(value ?? field.default)}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(clamp(Number(e.target.value), field.min, field.max))}
            className={fieldClass}
          />
          {field.suffix && (
            <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">
              {field.suffix}
            </span>
          )}
        </div>
      )}

      {field.type === "money" && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">{currency}</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={(Number(value ?? 0) / 100).toFixed(2)}
            onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
            className={fieldClass}
          />
        </div>
      )}

      {field.type === "select" && (
        <select
          value={String(value ?? field.default)}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1.5 ${fieldClass}`}
        >
          {(field.optionsSource === "tiers" ? tierOptions : field.options).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "image" && (
        <div className="mt-1.5">
          <BannerImageEditor
            merchantSlug={merchantSlug}
            value={typeof value === "string" ? value : null}
            onChange={onChange}
            compact
            uploadLabel={field.label}
          />
        </div>
      )}

      {field.help && (
        <span className="mt-1 block text-[11px] leading-snug text-on-surface-variant">
          {field.help}
        </span>
      )}
    </label>
  );
}

function clamp(value: number, min?: number, max?: number): number {
  if (Number.isNaN(value)) return min ?? 0;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}
