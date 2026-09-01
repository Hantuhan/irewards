import type { ReactNode } from "react";

type MobileShellProps = {
  children: ReactNode;
  className?: string;
};

export function MobileShell({ children, className = "" }: MobileShellProps) {
  return (
    <div className={`flex min-h-screen w-full justify-center bg-surface ${className}`}>
      <div className="relative min-h-screen w-full max-w-mobile border-x border-surface-container-high bg-surface-container-lowest shadow-[0_0_40px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </div>
  );
}
