import type { ReactNode } from "react";
import { PdpaFooter } from "@/components/storefront/PdpaFooter";

type MobileShellProps = {
  children: ReactNode;
  className?: string;
  showPdpa?: boolean;
};

export function MobileShell({ children, className = "", showPdpa = true }: MobileShellProps) {
  return (
    <div className={`flex min-h-screen w-full justify-center bg-surface ${className}`}>
      <div className="relative flex min-h-screen w-full max-w-mobile flex-col border-x border-surface-container-high bg-surface-container-lowest shadow-[0_0_40px_rgba(0,0,0,0.04)]">
        <div className="flex-1">{children}</div>
        {showPdpa && <PdpaFooter />}
      </div>
    </div>
  );
}
