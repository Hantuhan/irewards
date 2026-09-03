"use client";

import {
  SIMPLE_CATEGORY_DEFS,
  type SimpleOptionDef,
} from "@/lib/menu/simple-category-options";
import type { SimpleCategoryKind, SimpleCategoryProfile } from "@/lib/menu/simple-category-profile";

type MenuSimpleCategoryEditorProps = {
  kind: SimpleCategoryKind;
  value: SimpleCategoryProfile;
  onChange: (next: SimpleCategoryProfile) => void;
};

function ChipRow({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: SimpleOptionDef[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-on-surface-variant">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`border px-3 py-1.5 text-body-md transition-colors ${
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-surface-container-highest bg-white text-on-surface-variant"
              }`}
            >
              {option.label}
              {option.hint ? (
                <span className={`ml-1 text-[11px] ${selected ? "text-on-primary/80" : ""}`}>
                  {option.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MenuSimpleCategoryEditor({
  kind,
  value,
  onChange,
}: MenuSimpleCategoryEditorProps) {
  const def = SIMPLE_CATEGORY_DEFS[kind];

  function setDefault(groupId: string, next: string) {
    onChange({
      ...value,
      kind,
      detailLevel: "simple",
      defaults: { ...value.defaults, [groupId]: next },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          {def.title}
        </p>
        <p className="mt-1 text-body-md text-on-surface-variant">{def.simpleHint}</p>
      </div>

      <div className="flex flex-col gap-5 border border-surface-container-highest bg-surface-container-low p-4">
        {def.groups.map((group) => (
          <ChipRow
            key={group.id}
            label={group.name}
            hint={group.hint}
            options={group.options}
            value={value.defaults[group.id] ?? group.options[0]?.value ?? ""}
            onChange={(next) => setDefault(group.id, next)}
          />
        ))}
      </div>
    </div>
  );
}
