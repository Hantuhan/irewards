import type { ReactNode } from "react";

type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
  widthClassName?: string;
};

/** Minimal smartphone bezel for in-app previews. */
export function PhoneFrame({
  children,
  className = "",
  widthClassName = "w-[240px]",
}: PhoneFrameProps) {
  return (
    <div className={`mx-auto ${widthClassName} ${className}`}>
      <div className="rounded-[2.35rem] border-[7px] border-[#111] bg-[#111] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
        <div className="overflow-hidden rounded-[1.65rem] bg-black">
          <div className="relative flex h-7 items-end justify-between bg-black px-5 pb-0.5 pt-1.5 text-[9px] font-medium text-white">
            <span>9:41</span>
            <div className="absolute left-1/2 top-1.5 h-[18px] w-[68px] -translate-x-1/2 rounded-full bg-[#111] ring-1 ring-white/10" />
            <div className="flex items-center gap-1">
              <span className="h-2 w-2.5 rounded-sm border border-white/80" />
              <span className="h-2.5 w-4 rounded-[2px] border border-white/80">
                <span className="block h-full w-[70%] rounded-[1px] bg-white" />
              </span>
            </div>
          </div>
          <div className="bg-white">{children}</div>
          <div className="flex justify-center bg-white py-2">
            <div className="h-1 w-[88px] rounded-full bg-black/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
