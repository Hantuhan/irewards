import type { ReactNode } from "react";
import { manusDotGridClass, manusPanelClass } from "@/lib/ui/manus";

type MerchantAuthShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
};

export function MerchantAuthShell({
  eyebrow,
  title,
  description,
  wide = false,
  children,
}: MerchantAuthShellProps) {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center p-6 ${manusDotGridClass}`}
    >
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <header className={`mb-6 px-8 py-7 ${manusPanelClass}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-headline-lg text-[#1a3d2e]">{title}</h1>
          {description && (
            <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}
