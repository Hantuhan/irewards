"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { customerRoutes } from "@/lib/navigation/routes";
import { formatMultiplier } from "@/lib/format/number";
import { tierCardGradient } from "@/lib/loyalty/reward-level-map";

type RewardLevel = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  perkDescription: string | null;
  discountPercent: number;
  birthdayPoints?: number;
  welcomePoints?: number;
};

type TierSnapshot = {
  levelNumber: number;
  name: string;
  perkDescription: string | null;
  pointsMultiplier: number;
  lifetimePointsEarned: number;
  pointsToNextLevel: number | null;
  nextLevelName: string | null;
};

type RewardsShellProps = {
  merchantSlug: string;
  tableId: string;
};

const BENEFITS = [
  { icon: "redeem", title: "Welcome rewards", detail: "Join on WhatsApp after pay" },
  { icon: "paid", title: "Dine & earn", detail: "Points on every order" },
  { icon: "military_tech", title: "Tier programme", detail: "More value as you level up" },
  { icon: "cake", title: "Birthday offers", detail: "Bonus points in your birthday month" },
  { icon: "local_offer", title: "Cash voucher", detail: "Redeem points at checkout" },
  { icon: "campaign", title: "Monthly rewards", detail: "Campaigns from your café" },
  { icon: "card_giftcard", title: "Gift cards", detail: "Coming soon" },
  { icon: "group_add", title: "Referral", detail: "Invite friends via WhatsApp" },
  { icon: "storefront", title: "Reorder usual", detail: "One-tap from your table QR" },
];

const REWARD_CATALOG = [
  { title: "Birthday reward", subtitle: "Double points", points: 10, emoji: "🎂" },
  { title: "Welcome reward", subtitle: "Free drink + bonus points", points: 0, emoji: "☕" },
  { title: "Meal combo", subtitle: "Combo + free coffee", points: 500, emoji: "🍽️" },
  { title: "Free coffee", subtitle: "Any size", points: 200, emoji: "☕" },
];

export function RewardsShell({ merchantSlug, tableId }: RewardsShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { languages } = useStorefrontMenu(merchantSlug, lang);
  const [levels, setLevels] = useState<RewardLevel[]>([]);
  const [tier, setTier] = useState<TierSnapshot | null>(null);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const [view, setView] = useState<"home" | "catalog">("home");
  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/reward-levels?lang=${lang}`)
      .then((res) => res.json())
      .then((json: {
        levels?: RewardLevel[];
        merchant?: { name: string; languages?: string[] };
      }) => {
        if (json.levels) setLevels(json.levels);
        if (json.merchant?.name) setMerchantName(json.merchant.name);
      })
      .catch(() => undefined);

    const customerId = localStorage.getItem(`irewards-member:${merchantSlug}`);
    if (!customerId) return;

    fetch(`/api/customers/${customerId}/tier`)
      .then((res) => res.json())
      .then((json: {
        lifetimePointsEarned?: number;
        currentLevel?: {
          levelNumber: number;
          name: string;
          perkDescription: string | null;
          pointsMultiplier: number;
        };
        pointsToNextLevel?: number | null;
        nextLevel?: { name: string } | null;
      }) => {
        if (!json.currentLevel) return;
        setTier({
          levelNumber: json.currentLevel.levelNumber,
          name: json.currentLevel.name,
          perkDescription: json.currentLevel.perkDescription,
          pointsMultiplier: json.currentLevel.pointsMultiplier,
          lifetimePointsEarned: json.lifetimePointsEarned ?? 0,
          pointsToNextLevel: json.pointsToNextLevel ?? null,
          nextLevelName: json.nextLevel?.name ?? null,
        });
      })
      .catch(() => undefined);
  }, [merchantSlug, lang]);

  const cardGradient = tierCardGradient(
    tier?.levelNumber ?? levels[0]?.levelNumber ?? 1,
    tier?.name ?? levels[0]?.name,
  );

  return (
    <MobileShell>
      <header className="relative overflow-hidden border-b border-surface-container-highest px-6 pb-8 pt-12">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-container-low to-surface-container-lowest opacity-80" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 text-center font-display text-headline-sm uppercase tracking-[0.2em] text-primary">
              {merchantName} {copy.rewards}
            </p>
            {languages.length > 1 && (
              <StorefrontLanguagePicker languages={languages} value={lang} onChange={setLang} />
            )}
          </div>
          <div
            className="mx-auto mt-6 flex h-36 w-full max-w-[280px] flex-col justify-between rounded-xl p-5 text-on-primary shadow-lg"
            style={{ background: cardGradient }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-90">
              Membership
            </span>
            <div>
              <p className="font-display text-headline-md">{tier?.name ?? "Guest"}</p>
              <p className="mt-1 text-body-md opacity-90">
                {tier ? `${tier.lifetimePointsEarned} pts` : "Scan · order · join"}
              </p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-sm text-center text-body-md text-on-surface-variant">
            Earn points every visit. Unlock perks as you level up.
          </p>
        </div>
      </header>

      <div className="flex border-b border-surface-container-highest">
        {(["home", "catalog"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 py-3 font-display text-eyebrow uppercase ${
              view === v ? "border-b-2 border-primary text-primary" : "text-on-surface-variant"
            }`}
          >
            {v === "home" ? "Programme" : "Rewards"}
          </button>
        ))}
      </div>

      <main className="flex flex-col gap-6 px-6 py-8 pb-24">
        {view === "home" ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex flex-col items-center text-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-surface-container-highest bg-surface-container-lowest">
                    <Icon name={b.icon} className="text-primary" />
                  </div>
                  <p className="font-display text-[10px] uppercase leading-tight text-primary">
                    {b.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-on-surface-variant">
                    {b.detail}
                  </p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="mb-3 font-display text-headline-sm text-primary">Tier ladder</h2>
              <ul className="flex flex-col border border-surface-container-highest">
                {levels.map((level) => (
                  <li
                    key={level.levelNumber}
                    className={`border-b border-surface-container p-4 last:border-0 ${
                      tier?.levelNumber === level.levelNumber
                        ? "border-l-4 border-l-primary bg-primary text-on-primary"
                        : ""
                    }`}
                  >
                    <p
                      className={`font-display text-headline-sm ${
                        tier?.levelNumber === level.levelNumber ? "text-on-primary" : "text-primary"
                      }`}
                    >
                      {level.name}
                    </p>
                    <p
                      className={`mt-1 text-body-md ${
                        tier?.levelNumber === level.levelNumber
                          ? "text-on-primary/80"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {level.minLifetimePoints}+ pts · {formatMultiplier(level.pointsMultiplier)}x earn
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <ul className="space-y-3">
            {REWARD_CATALOG.map((reward) => (
              <li
                key={reward.title}
                className="flex overflow-hidden border border-surface-container-highest bg-surface-container-lowest"
              >
                <div className="flex w-20 shrink-0 items-center justify-center bg-surface-container text-3xl">
                  {reward.emoji}
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 border-l-4 border-primary p-4">
                  <div>
                    <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                      {reward.title}
                    </p>
                    <p className="font-display text-headline-sm text-primary">{reward.subtitle}</p>
                  </div>
                  <span className="shrink-0 font-mono text-label-mono text-primary">
                    {reward.points} pts
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!tier && (
          <Link
            href={routes.shop}
            className="flex items-center justify-center gap-2 bg-primary py-4 font-display text-headline-sm text-on-primary"
          >
            <Icon name="storefront" />
            Order to start earning
          </Link>
        )}
      </main>

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="rewards"
        labels={{
          shop: copy.shop,
          rewards: copy.rewards,
          cart: copy.cart,
          profile: copy.profile,
        }}
      />
    </MobileShell>
  );
}
