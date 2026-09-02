"use client";

import { PROGRAM_LANGUAGES, type ProgramLanguage } from "@/lib/i18n/program-locale";

type StorefrontLanguagePickerProps = {
  languages: ProgramLanguage[];
  value: ProgramLanguage;
  onChange: (lang: ProgramLanguage) => void;
  label?: string;
};

export function StorefrontLanguagePicker({
  languages,
  value,
  onChange,
  label,
}: StorefrontLanguagePickerProps) {
  if (languages.length <= 1) return null;

  const options = PROGRAM_LANGUAGES.filter((l) => languages.includes(l.code));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
      )}
      <div className="flex gap-1">
        {options.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            className={`px-2 py-1 font-mono text-[10px] uppercase transition-colors ${
              value === lang.code
                ? "bg-primary text-on-primary"
                : "border border-surface-container-highest text-on-surface-variant hover:border-primary/40"
            }`}
          >
            {lang.short}
          </button>
        ))}
      </div>
    </div>
  );
}
