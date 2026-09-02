import { Icon } from "@/components/ui/Icon";

type ProductSettingsSectionProps = {
  step: number;
  title: string;
  icon: string;
  description?: string;
  children: React.ReactNode;
};

export function ProductSettingsSection({
  step,
  title,
  icon,
  description,
  children,
}: ProductSettingsSectionProps) {
  return (
    <section className="border border-surface-container-highest bg-surface-container-lowest">
      <div className="flex items-start gap-3 border-b border-surface-container-highest px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary font-mono text-label-mono text-on-primary">
          {step}
        </span>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/20 bg-surface-container-low">
            <Icon name={icon} className="text-xl text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-headline-sm text-primary">{title}</p>
            {description && (
              <p className="mt-0.5 text-body-md text-on-surface-variant">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
