"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { customerRoutes } from "@/lib/navigation/routes";

type RewardLevel = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  perkDescription: string | null;
  discountPercent: number;
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

const DEMO_VOUCHERS = [
  {
    code: "IR-WELCOME",
    title: "10% off next order",
    detail: "Join iRewards on WhatsApp to unlock",
    locked: true,
  },
];

export function RewardsShell({ merchantSlug, tableId }: RewardsShellProps) {
  const [levels, setLevels] = useState<RewardLevel[]>([]);
  const [tier, setTier] = useState<TierSnapshot | null>(null);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const routes = customerRoutes(merchantSlug, tableId);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/reward-levels`)
      .then((res) => res.json())
      .then((json: { levels?: RewardLevel[]; merchant?: { name: string } }) => {
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
  }, [merchantSlug]);

  const currentLevel = tier ?? levels[0];
  const progressPct =
    tier?.pointsToNextLevel && tier.lifetimePointsEarned
      ? Math.min(
          95,
          Math.max(
            8,
            (tier.lifetimePointsEarned /
              (tier.lifetimePointsEarned + tier.pointsToNextLevel)) *
              100,
          ),
        )
      : tier
        ? 100
        : 12;

  return (
    <MobileShell>
      <header className="border-b border-surface-container-highest px-6 pb-6 pt-12">
        <p className="font-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
          {merchantName}
        </p>
        <h1 className="mt-2 font-display text-headline-mobile text-primary">
          Your iRewards
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Earn points on every visit. Unlock perks as you level up.
        </p>
        {currentLevel && (
          <div className="mt-4 inline-flex items-center gap-3 border border-primary bg-surface-container-lowest px-4 py-2">
            <span className="font-mono text-label-mono uppercase tracking-widest text-primary">
              {tier ? tier.name : "Guest"}
            </span>
            {tier && (
              <>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="font-display text-eyebrow uppercase text-primary">
                  {tier.pointsMultiplier}x pts
                </span>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex flex-col gap-8 px-6 py-8 pb-24">
        <section className="zenith-surface flex flex-col gap-4 p-6">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-headline-sm text-primary">
              Lifetime tier progress
            </h2>
            {tier && (
              <span className="font-mono text-label-mono text-on-surface-variant">
                {tier.lifetimePointsEarned} pts
              </span>
            )}
          </div>
          <div className="h-4 w-full border border-surface-container-high bg-surface-container">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-body-md text-on-surface-variant">
            {tier?.pointsToNextLevel && tier.nextLevelName
              ? `${tier.pointsToNextLevel} points to ${tier.nextLevelName}`
              : tier
                ? "You are at the top tier for this merchant."
                : "Order and join on WhatsApp after payment to start earning."}
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-display text-headline-sm text-primary">
            Tier ladder
          </h2>
          <ul className="flex flex-col border border-surface-container-highest">
            {levels.map((level) => {
              const isCurrent = tier?.levelNumber === level.levelNumber;
              return (
                <li
                  key={level.levelNumber}
                  className={`flex items-start gap-4 border-b border-surface-container p-4 last:border-0 ${
                    isCurrent ? "bg-surface-container-low" : ""
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                      isCurrent
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container bg-surface-container-lowest text-on-surface-variant"
                    }`}
                  >
                    <span className="font-mono text-label-mono">{level.levelNumber}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-headline-sm text-primary">
                      {level.name}
                    </h3>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {level.minLifetimePoints}+ lifetime pts · {level.pointsMultiplier}x
                      earn · {level.discountPercent}% checkout discount
                    </p>
                    {level.perkDescription && (
                      <p className="mt-1 text-body-md text-on-surface-variant">
                        {level.perkDescription}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-display text-headline-sm text-primary">
            Vouchers
          </h2>
          <div className="flex flex-col gap-3">
            {DEMO_VOUCHERS.map((voucher) => (
              <div
                key={voucher.code}
                className={`zenith-surface p-4 ${voucher.locked ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-label-mono text-primary">
                    {voucher.code}
                  </span>
                  {voucher.locked && (
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Locked
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-display text-headline-sm text-primary">
                  {voucher.title}
                </h3>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {voucher.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

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
      />
    </MobileShell>
  );
}
