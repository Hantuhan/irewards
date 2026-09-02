import type { CoffeeProfile } from "@/lib/menu/coffee-profile";
import {
  coffeeProfileHasDisplay,
  processMethodLabel,
  roastLevelLabel,
} from "@/lib/menu/coffee-profile";

type MenuCoffeeProfileDisplayProps = {
  profile: CoffeeProfile;
  copy?: {
    roastLevel?: string;
    tastingNotes?: string;
    origin?: string;
    process?: string;
    beanVariety?: string;
    acidity?: string;
    body?: string;
    sweetness?: string;
  };
};

function intensityBar(value: number) {
  return "●".repeat(value) + "○".repeat(5 - value);
}

export function MenuCoffeeProfileDisplay({ profile, copy }: MenuCoffeeProfileDisplayProps) {
  if (!coffeeProfileHasDisplay(profile)) return null;

  const flavor = profile.flavorProfile ?? {};

  return (
    <div className="mt-5 border border-surface-container-highest bg-surface-container-lowest p-4">
      <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
        Taste profile
      </p>
      <dl className="mt-3 flex flex-col gap-3 text-body-md">
        {profile.roastLevel && (
          <div>
            <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
              {copy?.roastLevel ?? "Roast level"}
            </dt>
            <dd className="text-on-surface">{roastLevelLabel(profile.roastLevel)}</dd>
          </div>
        )}
        {profile.tastingNotes && profile.tastingNotes.length > 0 && (
          <div>
            <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
              {copy?.tastingNotes ?? "Tasting notes"}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {profile.tastingNotes.map((note) => (
                <span
                  key={note}
                  className="border border-surface-container-highest px-2 py-0.5 text-body-md text-on-surface"
                >
                  {note}
                </span>
              ))}
            </dd>
          </div>
        )}
        {profile.origin && (
          <div>
            <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
              {copy?.origin ?? "Origin"}
            </dt>
            <dd className="text-on-surface">{profile.origin}</dd>
          </div>
        )}
        {profile.processMethod && (
          <div>
            <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
              {copy?.process ?? "Process"}
            </dt>
            <dd className="text-on-surface">{processMethodLabel(profile.processMethod)}</dd>
          </div>
        )}
        {profile.beanVariety && (
          <div>
            <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
              {copy?.beanVariety ?? "Bean variety"}
            </dt>
            <dd className="text-on-surface">{profile.beanVariety}</dd>
          </div>
        )}
        {(flavor.acidity || flavor.body || flavor.sweetness) && (
          <div className="grid gap-2 sm:grid-cols-3">
            {flavor.acidity && (
              <div>
                <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
                  {copy?.acidity ?? "Acidity"}
                </dt>
                <dd className="font-mono text-label-mono text-primary">
                  {intensityBar(flavor.acidity)}
                </dd>
              </div>
            )}
            {flavor.body && (
              <div>
                <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
                  {copy?.body ?? "Body"}
                </dt>
                <dd className="font-mono text-label-mono text-primary">
                  {intensityBar(flavor.body)}
                </dd>
              </div>
            )}
            {flavor.sweetness && (
              <div>
                <dt className="font-mono text-[10px] uppercase text-on-surface-variant">
                  {copy?.sweetness ?? "Sweetness"}
                </dt>
                <dd className="font-mono text-label-mono text-primary">
                  {intensityBar(flavor.sweetness)}
                </dd>
              </div>
            )}
          </div>
        )}
      </dl>
    </div>
  );
}
