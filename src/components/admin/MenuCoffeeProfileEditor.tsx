"use client";

import {
  COFFEE_PROCESS_OPTIONS,
  COFFEE_ROAST_OPTIONS,
  COFFEE_TASTING_NOTE_SUGGESTIONS,
  type CoffeeDetailLevel,
  type CoffeeFlavorProfile,
  type CoffeeProductKind,
  type CoffeeProfile,
  type FlavorIntensity,
} from "@/lib/menu/coffee-profile";

type MenuCoffeeProfileEditorProps = {
  value: CoffeeProfile;
  onChange: (next: CoffeeProfile) => void;
};

function IntensitySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: FlavorIntensity;
  onChange: (next?: FlavorIntensity) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-label-mono text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : (n as FlavorIntensity))}
            className={`h-8 w-8 border font-mono text-label-mono transition-colors ${
              value === n
                ? "border-primary bg-primary text-on-primary"
                : "border-surface-container-highest text-on-surface-variant"
            }`}
            aria-label={`${label} ${n}`}
          >
            {n}
          </button>
        ))}
        <span className="text-body-md text-on-surface-variant">1 = low · 5 = high</span>
      </div>
    </label>
  );
}

export function MenuCoffeeProfileEditor({ value, onChange }: MenuCoffeeProfileEditorProps) {
  const detailLevel = value.detailLevel ?? "simple";
  const flavor = value.flavorProfile ?? {};
  const tastingNotes = value.tastingNotes ?? [];

  function setDetailLevel(level: CoffeeDetailLevel) {
    onChange({ ...value, detailLevel: level });
  }

  function setFlavor(patch: Partial<CoffeeFlavorProfile>) {
    onChange({ ...value, flavorProfile: { ...flavor, ...patch } });
  }

  function toggleTastingNote(note: string) {
    const next = tastingNotes.includes(note)
      ? tastingNotes.filter((n) => n !== note)
      : [...tastingNotes, note];
    onChange({ ...value, tastingNotes: next });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Coffee product type
        </p>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Simple keeps setup minimal. Advanced lets you add taste profile fields — only filled
          fields appear on the diner menu.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { level: "simple" as CoffeeDetailLevel, label: "Simple" },
              { level: "advanced" as CoffeeDetailLevel, label: "Advanced" },
            ] as const
          ).map(({ level, label }) => (
            <button
              key={level}
              type="button"
              onClick={() => setDetailLevel(level)}
              className={`border px-4 py-2 font-display text-headline-sm transition-colors ${
                detailLevel === level
                  ? "border-primary bg-primary text-on-primary"
                  : "border-surface-container-highest text-on-surface-variant"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-surface-container-highest bg-surface-container-low p-4">
        <p className="font-mono text-label-mono text-on-surface-variant">Product kind</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { kind: "drink" as CoffeeProductKind, label: "Drink" },
              { kind: "retail_beans" as CoffeeProductKind, label: "Retail beans" },
            ] as const
          ).map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onChange({ ...value, kind })}
              className={`border px-3 py-1.5 text-body-md transition-colors ${
                value.kind === kind
                  ? "border-primary bg-primary text-on-primary"
                  : "border-surface-container-highest text-on-surface-variant"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {value.kind === "drink" && (
          <label className="mt-4 block">
            <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Default temperature
            </span>
            <select
              value={value.defaultTemperature ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  defaultTemperature:
                    e.target.value === "hot" || e.target.value === "cold"
                      ? e.target.value
                      : undefined,
                })
              }
              className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
            >
              <option value="">Not set</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
            </select>
          </label>
        )}
      </div>

      {detailLevel === "advanced" && (
        <div className="flex flex-col gap-5 border border-surface-container-highest bg-surface-container-low p-4">
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Taste profile (optional)
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Roast level
              </span>
              <select
                value={value.roastLevel ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    roastLevel: (e.target.value as CoffeeProfile["roastLevel"]) || null,
                  })
                }
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              >
                <option value="">Not set</option>
                {COFFEE_ROAST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Process method
              </span>
              <select
                value={value.processMethod ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    processMethod: (e.target.value as CoffeeProfile["processMethod"]) || null,
                  })
                }
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              >
                <option value="">Not set</option>
                {COFFEE_PROCESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Origin / region
              </span>
              <input
                value={value.origin ?? ""}
                onChange={(e) => onChange({ ...value, origin: e.target.value })}
                placeholder="e.g. Ethiopia Yirgacheffe, Colombia Huila"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                Bean variety
              </span>
              <input
                value={value.beanVariety ?? ""}
                onChange={(e) => onChange({ ...value, beanVariety: e.target.value })}
                placeholder="e.g. 100% Arabica, Bourbon, Geisha"
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Tasting notes
            </p>
            <div className="flex flex-wrap gap-2">
              {COFFEE_TASTING_NOTE_SUGGESTIONS.map((note) => {
                const selected = tastingNotes.includes(note);
                return (
                  <button
                    key={note}
                    type="button"
                    onClick={() => toggleTastingNote(note)}
                    className={`border px-3 py-1.5 text-body-md transition-colors ${
                      selected
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <IntensitySlider
              label="Acidity"
              value={flavor.acidity}
              onChange={(n) => setFlavor({ acidity: n })}
            />
            <IntensitySlider
              label="Body"
              value={flavor.body}
              onChange={(n) => setFlavor({ body: n })}
            />
            <IntensitySlider
              label="Sweetness"
              value={flavor.sweetness}
              onChange={(n) => setFlavor({ sweetness: n })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
