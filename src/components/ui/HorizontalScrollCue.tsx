"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type HorizontalScrollCueProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Tailwind `from-*` class for the edge fade, matching the parent background. */
  fadeFromClass?: string;
  controlClassName?: string;
  ariaLabel?: string;
};

export function HorizontalScrollCue({
  children,
  className = "",
  contentClassName = "",
  fadeFromClass = "from-surface-container-lowest",
  controlClassName = "border-surface-container-highest bg-surface-container-lowest",
  ariaLabel = "Scrollable list",
}: HorizontalScrollCueProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 4;
    setCanLeft(overflow && el.scrollLeft > 4);
    setCanRight(overflow && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    for (const child of el.children) {
      if (child instanceof HTMLElement) ro.observe(child);
    }
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.65), behavior: "smooth" });
  }

  const overflow = canLeft || canRight;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollerRef}
        className={`no-scrollbar flex overflow-x-auto ${contentClassName}`}
        aria-label={ariaLabel}
        tabIndex={overflow ? 0 : undefined}
      >
        {children}
      </div>

      {canLeft && (
        <>
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-14 bg-gradient-to-r ${fadeFromClass} to-transparent`}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label="Scroll left"
            className={`absolute left-0 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center border text-on-surface hover:text-primary ${controlClassName}`}
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
        </>
      )}

      {canRight && (
        <>
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-14 bg-gradient-to-l ${fadeFromClass} to-transparent`}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label="Scroll right"
            className={`absolute right-0 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center border text-on-surface hover:text-primary ${controlClassName}`}
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        </>
      )}
    </div>
  );
}
