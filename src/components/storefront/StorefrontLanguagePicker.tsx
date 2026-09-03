"use client";

import { PROGRAM_LANGUAGES, type ProgramLanguage } from "@/lib/i18n/program-locale";

type StorefrontLanguagePickerProps = {
  languages: ProgramLanguage[];
  value: ProgramLanguage;
  onChange: (lang: ProgramLanguage) => void;
  label?: string;
  /** `text` = mockup-style plain links; `pill` = segmented control */
  variant?: "text" | "pill";
};

export function StorefrontLanguagePicker({
  languages,
  value,
  onChange,
  label,
  variant = "pill",
}: StorefrontLanguagePickerProps) {
  if (languages.length <= 1) return null;

  const options = PROGRAM_LANGUAGES.filter((l) => languages.includes(l.code));

  if (variant === "text") {
    return (
      <div className="flex shrink-0 items-center gap-2.5 pt-0.5" role="group" aria-label={label ?? "Language"}>
        {options.map((lang) => {
          const active = value === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onChange(lang.code)}
              className={`font-mono text-[11px] uppercase tracking-wide transition-colors ${
                active
                  ? "font-bold text-on-surface"
                  : "font-medium text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {lang.short}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
      )}
      <div
        className="inline-flex shrink-0 overflow-hidden rounded-full border border-on-surface/15 bg-surface-container-low p-0.5"
        role="group"
        aria-label={label ?? "Language"}
      >
        {options.map((lang) => {
          const active = value === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onChange(lang.code)}
              className={`min-w-[2.25rem] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                active
                  ? "rounded-full bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {lang.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
