"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type StorefrontDocShellProps = {
  merchantSlug: string;
  merchantName: string;
  title: string;
  content: string;
  /** Optional fallback when there is no in-app history (defaults to storefront home). */
  fallbackHref?: string;
};

/** Split plain text into paragraphs / bullet groups for readable mobile layout. */
function DocBody({ content }: { content: string }) {
  const blocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="mt-5 space-y-5">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.every((l) => /^[-•*]|\d+\./.test(l));

        if (isList) {
          return (
            <ul
              key={i}
              className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-on-surface"
            >
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^[-•*]\s*|\d+\.\s*/, "")}</li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1 && lines[0]!.length < 60 && !lines[0]!.endsWith(".")) {
          return (
            <h2 key={i} className="font-display text-[16px] font-semibold text-primary">
              {lines[0]}
            </h2>
          );
        }

        return (
          <div key={i} className="space-y-2">
            {lines.map((line, j) => {
              if (/^[-•*]|\d+\./.test(line)) {
                return (
                  <p
                    key={j}
                    className="pl-4 text-[14px] leading-relaxed text-on-surface before:mr-2 before:content-['•']"
                  >
                    {line.replace(/^[-•*]\s*|\d+\.\s*/, "")}
                  </p>
                );
              }
              return (
                <p key={j} className="text-[14px] leading-relaxed text-on-surface">
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Mobile doc page (policies, help) with back navigation. */
export function StorefrontDocShell({
  merchantSlug,
  merchantName,
  title,
  content,
  fallbackHref,
}: StorefrontDocShellProps) {
  const router = useRouter();
  const home = fallbackHref ?? `/m/${merchantSlug}`;

  function goBack() {
    try {
      const ref = document.referrer;
      if (ref) {
        const origin = new URL(ref).origin;
        if (origin === window.location.origin) {
          router.back();
          return;
        }
      }
    } catch {
      /* ignore */
    }
    router.push(home);
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-surface">
      <div className="relative flex min-h-screen w-full max-w-mobile flex-col border-x border-surface-container-high bg-surface-container-lowest shadow-[0_0_40px_rgba(0,0,0,0.04)]">
        <header className="sticky top-0 z-30 border-b border-surface-container-highest/80 bg-surface-container-lowest/95 backdrop-blur-md">
          <div className="flex h-14 items-center gap-0.5 px-2">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 shrink-0 items-center gap-0.5 px-2 text-primary"
              aria-label="Go back"
            >
              <Icon name="arrow_back" className="text-xl" />
              <span className="font-display text-[14px] font-medium">Back</span>
            </button>
            <div className="min-w-0 flex-1 pr-3 text-right">
              <p className="truncate font-display text-[14px] font-bold tracking-tight text-primary">
                {merchantName}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pb-16 pt-6">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-primary">
            {title}
          </h1>
          <DocBody content={content} />
        </main>
      </div>
    </div>
  );
}

/** @deprecated Prefer StorefrontDocShell — kept for existing legal imports. */
export function LegalPolicyShell({
  merchantSlug,
  merchantName,
  title,
  content,
}: {
  merchantSlug: string;
  merchantName: string;
  title: string;
  content: string;
}) {
  return (
    <StorefrontDocShell
      merchantSlug={merchantSlug}
      merchantName={merchantName}
      title={title}
      content={content}
    />
  );
}
