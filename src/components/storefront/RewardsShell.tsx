"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { customerRoutes } from "@/lib/navigation/routes";
import { formatMultiplier } from "@/lib/format/number";
import { parseLevelGifts } from "@/lib/loyalty/level-gifts";

type RewardLevel = {
  levelNumber: number;
  name: string;
  minLifetimePoints: number;
  pointsMultiplier: number;
  perkDescription: string | null;
  discountPercent: number;
  tierActive?: boolean;
  birthdayPoints?: number;
  welcomePoints?: number;
  welcomeRewards?: number;
  renewPoints?: number;
  renewRewards?: number;
};

type TierSnapshot = {
  levelNumber: number;
  name: string;
  perkDescription: string | null;
  pointsMultiplier: number;
  lifetimePointsEarned: number;
  pointsBalance: number;
  pointsToNextLevel: number | null;
  nextLevelName: string | null;
  nextLevelNumber: number | null;
  nextLevelMinPoints: number | null;
};

type StampProgress = {
  enabled: boolean;
  filled: number;
  size: number;
  remaining: number;
  readyToRedeem: boolean;
  pendingReward: boolean;
  rewardLabel: string | null;
  stampsCollected: number;
  voucher?: CustomerVoucher | null;
};

type CustomerVoucher = {
  id: string;
  name: string;
  code: string | null;
  description: string;
  expiresAt: string | null;
  status: "active" | "expiring_soon";
  source: "stamp_card" | "campaign" | "merchant" | "unknown";
};

type EliteBenefit = {
  id: string;
  title: string;
  description: string;
  icon: string;
  locked: boolean;
  unlockHint?: string;
};

type RewardsShellProps = {
  merchantSlug: string;
  tableId: string;
};

function expiresInLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

function buildEliteBenefits(
  current: RewardLevel | undefined,
  next: RewardLevel | undefined,
  tier: TierSnapshot | null,
): EliteBenefit[] {
  const benefits: EliteBenefit[] = [];
  const mult = tier?.pointsMultiplier ?? current?.pointsMultiplier ?? 1;
  if (mult > 1) {
    const pct = Math.round((mult - 1) * 100);
    benefits.push({
      id: "multiplier",
      title: `${formatMultiplier(mult)}x Points Multiplier`,
      description:
        pct > 0
          ? `Earn points ${pct}% faster on all standard menu items.`
          : "Earn points faster on all standard menu items.",
      icon: "bolt",
      locked: false,
    });
  } else if (current) {
    benefits.push({
      id: "multiplier",
      title: "Points on every visit",
      description: "Earn points with each order — climb tiers for faster earning.",
      icon: "bolt",
      locked: false,
    });
  }

  const currentGifts = current ? parseLevelGifts(current.perkDescription) : [];
  for (const [i, gift] of currentGifts.slice(0, 2).entries()) {
    benefits.push({
      id: `current-gift-${i}`,
      title: gift,
      description: `Included with ${current?.name ?? "your level"}.`,
      icon: i === 0 ? "restaurant" : "card_giftcard",
      locked: false,
    });
  }

  if (next) {
    const nextGifts = parseLevelGifts(next.perkDescription);
    const lockedTitle = nextGifts[0] ?? `Level ${next.levelNumber} perks`;
    benefits.push({
      id: `locked-${next.levelNumber}`,
      title: lockedTitle,
      description: `Unlocks at ${next.name}.`,
      icon: "local_cafe",
      locked: true,
      unlockHint: next.name,
    });
  }

  return benefits.slice(0, 4);
}

/** Square stamp grid matching the Rewards mock (filled star / empty / goal cup). */
function RewardsStampGrid({ filled, size }: { filled: number; size: number }) {
  const holes = Math.max(2, Math.min(12, size));
  const stamped = Math.max(0, Math.min(holes, filled));

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {Array.from({ length: holes }, (_, i) => {
        const on = i < stamped;
        const isGoal = i === holes - 1;
        return (
          <span
            key={i}
            className={`flex aspect-square items-center justify-center ${
              on
                ? "bg-primary text-on-primary"
                : "border border-on-surface/15 text-on-surface-variant/35"
            }`}
            aria-hidden
          >
            {on ? (
              <Icon name="star" className="text-[22px]" filled />
            ) : isGoal ? (
              <Icon name="local_cafe" className="text-[22px]" />
            ) : (
              <Icon name="star" className="text-[20px]" />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function RewardsShell({ merchantSlug, tableId }: RewardsShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { languages } = useStorefrontMenu(merchantSlug, lang);
  const [levels, setLevels] = useState<RewardLevel[]>([]);
  const [tier, setTier] = useState<TierSnapshot | null>(null);
  const [merchantName, setMerchantName] = useState(merchantSlug);
  const [pointsOn, setPointsOn] = useState(true);
  const [stampsOn, setStampsOn] = useState(false);
  const [stamps, setStamps] = useState<StampProgress | null>(null);
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const routes = customerRoutes(merchantSlug, tableId);

  const loadStamps = useCallback(() => {
    const customerId = localStorage.getItem(`irewards-member:${merchantSlug}`);
    const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
    return fetch(`/api/merchant/${merchantSlug}/stamps/progress${qs}`)
      .then((res) => res.json())
      .then(
        (json: {
          pointsProgramEnabled?: boolean;
          stampsProgramEnabled?: boolean;
          progress?: StampProgress;
          vouchers?: CustomerVoucher[];
        }) => {
          setPointsOn(json.pointsProgramEnabled !== false);
          setStampsOn(Boolean(json.stampsProgramEnabled));
          if (json.progress) setStamps(json.progress);
          if (Array.isArray(json.vouchers)) setVouchers(json.vouchers);
        },
      )
      .catch(() => undefined);
  }, [merchantSlug]);

  useEffect(() => {
    void loadStamps();
  }, [loadStamps]);

  useEffect(() => {
    fetch(`/api/merchant/${merchantSlug}/reward-levels?lang=${lang}`)
      .then((res) => res.json())
      .then(
        (json: {
          levels?: RewardLevel[];
          merchant?: { name: string; languages?: string[] };
        }) => {
          if (json.levels) setLevels(json.levels);
          if (json.merchant?.name) setMerchantName(json.merchant.name);
        },
      )
      .catch(() => undefined);

    const customerId = localStorage.getItem(`irewards-member:${merchantSlug}`);
    if (!customerId) {
      setTier(null);
      return;
    }

    fetch(`/api/customers/${customerId}/tier`)
      .then((res) => res.json())
      .then(
        (json: {
          lifetimePointsEarned?: number;
          pointsBalance?: number;
          currentLevel?: {
            levelNumber: number;
            name: string;
            perkDescription: string | null;
            pointsMultiplier: number;
          };
          pointsToNextLevel?: number | null;
          nextLevel?: {
            name: string;
            levelNumber?: number;
            minLifetimePoints?: number;
          } | null;
        }) => {
          if (!json.currentLevel) return;
          setTier({
            levelNumber: json.currentLevel.levelNumber,
            name: json.currentLevel.name,
            perkDescription: json.currentLevel.perkDescription,
            pointsMultiplier: json.currentLevel.pointsMultiplier,
            lifetimePointsEarned: json.lifetimePointsEarned ?? 0,
            pointsBalance: json.pointsBalance ?? 0,
            pointsToNextLevel: json.pointsToNextLevel ?? null,
            nextLevelName: json.nextLevel?.name ?? null,
            nextLevelNumber: json.nextLevel?.levelNumber ?? null,
            nextLevelMinPoints: json.nextLevel?.minLifetimePoints ?? null,
          });
        },
      )
      .catch(() => undefined);
  }, [merchantSlug, lang]);

  const activeLevels = useMemo(
    () => levels.filter((l) => l.tierActive !== false),
    [levels],
  );

  const currentLevel = activeLevels.find((l) => l.levelNumber === tier?.levelNumber);
  const nextLevel =
    activeLevels.find((l) => l.levelNumber === tier?.nextLevelNumber) ??
    activeLevels.find((l) => l.levelNumber === (tier?.levelNumber ?? 0) + 1);

  const eliteBenefits = useMemo(
    () => buildEliteBenefits(currentLevel, nextLevel, tier),
    [currentLevel, nextLevel, tier],
  );

  const stampFilled = stamps?.filled ?? 0;
  const stampSize = stamps?.size ?? 8;
  const stampRemaining = stamps?.remaining ?? Math.max(0, stampSize - stampFilled);

  const tierProgress = useMemo(() => {
    if (!tier || tier.nextLevelMinPoints == null) return 1;
    const floor = currentLevel?.minLifetimePoints ?? 0;
    const ceiling = tier.nextLevelMinPoints;
    if (ceiling <= floor) return 1;
    return Math.min(
      1,
      Math.max(0, (tier.lifetimePointsEarned - floor) / (ceiling - floor)),
    );
  }, [tier, currentLevel]);

  async function redeemStamps() {
    setRedeemBusy(true);
    setRedeemMsg(null);
    try {
      const res = await fetch("/api/customer/stamps/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantSlug }),
      });
      const json = (await res.json()) as {
        error?: string;
        progress?: StampProgress;
        voucher?: { code?: string | null; name?: string } | null;
      };
      if (!res.ok) throw new Error(json.error ?? "Redeem failed");
      if (json.progress) setStamps(json.progress);
      const code = json.voucher?.code?.trim();
      setRedeemMsg(
        code
          ? `Voucher ready — use code ${code} at checkout.`
          : "Voucher unlocked — check Active Vouchers below.",
      );
      await loadStamps();
    } catch (err) {
      setRedeemMsg(err instanceof Error ? err.message : "Redeem failed");
    } finally {
      setRedeemBusy(false);
    }
  }

  const paused = !pointsOn && !stampsOn;

  return (
    <MobileShell>
      <header className="sticky top-0 z-30 border-b border-surface-container-highest/80 bg-surface-container-lowest/95 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight text-primary">
              {merchantName}
            </h1>
            <span className="shrink-0 rounded border border-on-surface/20 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-on-surface">
              {copy.table} {tableId}
            </span>
          </div>
          {languages.length > 1 && (
            <StorefrontLanguagePicker languages={languages} value={lang} onChange={setLang} />
          )}
        </div>
      </header>

      {paused ? (
        <main className="px-5 py-12 pb-24 text-center text-body-md text-on-surface-variant">
          Rewards are paused at this café right now.
        </main>
      ) : (
        <main className="flex flex-col pb-24">
          {/* Title */}
          <section className="border-b border-surface-container-highest px-5 pb-6 pt-7">
            <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-primary">
              Your Rewards
            </h2>
            <p className="mt-2 max-w-[20rem] text-[14px] leading-relaxed text-on-surface-variant">
              Continue exploring our menu to unlock the next level of culinary mastery.
            </p>
          </section>

          {/* Current Progress — stamps */}
          {stampsOn && (
            <section className="border-b border-surface-container-highest px-5 py-7">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[18px] font-bold text-primary">
                  Current Progress
                </h3>
                <p className="font-mono text-[12px] text-on-surface-variant">
                  {stampFilled} / {stampSize} Stamps
                </p>
              </div>

              <RewardsStampGrid filled={stampFilled} size={stampSize} />

              <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                {vouchers.some((v) => v.source === "stamp_card")
                  ? "Stamp card complete — voucher ready below"
                  : stamps?.pendingReward
                    ? `Reward ready: ${stamps.rewardLabel ?? "your treat"}`
                    : stamps?.readyToRedeem
                      ? `Card full — claim ${stamps.rewardLabel ?? "your reward"}`
                      : `${stampRemaining} more order${stampRemaining === 1 ? "" : "s"} to unlock ${
                          stamps?.rewardLabel
                            ? `a complimentary ${stamps.rewardLabel}`
                            : "a complimentary signature dish"
                        }`}
              </p>

              {redeemMsg && (
                <p className="mt-3 text-center text-[13px] text-primary" role="status">
                  {redeemMsg}
                </p>
              )}

              {stamps?.readyToRedeem && (
                <button
                  type="button"
                  disabled={redeemBusy}
                  onClick={() => void redeemStamps()}
                  className="mt-4 w-full bg-primary py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary disabled:opacity-50"
                >
                  {redeemBusy ? "Claiming…" : "Claim voucher"}
                </button>
              )}
            </section>
          )}

          {/* Lifetime Tier Progress — points */}
          {pointsOn && (
            <section className="border-b border-surface-container-highest px-5 py-7">
              <h3 className="font-display text-[18px] font-bold text-primary">
                Lifetime Tier Progress
              </h3>

              {tier ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                        Current balance
                      </p>
                      <p className="mt-1 font-display text-[26px] font-bold leading-none text-primary">
                        {tier.pointsBalance}
                        <span className="ml-1 text-[14px] font-normal text-on-surface-variant">
                          pts
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                        {tier.nextLevelName
                          ? `Next tier: ${tier.nextLevelName}`
                          : "Top tier"}
                      </p>
                      <p className="mt-1 font-display text-[26px] font-bold leading-none text-primary">
                        {tier.nextLevelMinPoints != null ? (
                          <>
                            {tier.nextLevelMinPoints}
                            <span className="ml-1 text-[14px] font-normal text-on-surface-variant">
                              pts
                            </span>
                          </>
                        ) : (
                          <span className="text-[18px]">Maxed</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-5 h-2.5 w-full overflow-hidden bg-surface-container">
                    <div
                      className="absolute inset-y-0 left-0 bg-on-surface/25 transition-all"
                      style={{ width: `${Math.round(tierProgress * 100)}%` }}
                    />
                    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-on-surface/40" />
                  </div>

                  <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">
                    {tier.pointsToNextLevel != null && tier.nextLevelName
                      ? `You need ${tier.pointsToNextLevel} more points to reach ${tier.nextLevelName}. Points accumulate based on total spend across all affiliated locations.`
                      : `You're at ${tier.name}. Points accumulate based on total spend across all affiliated locations.`}
                  </p>
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-[14px] leading-relaxed text-on-surface-variant">
                    Join iRewards after your order to track lifetime points and unlock tiers.
                  </p>
                  <Link
                    href={routes.shop}
                    className="mt-4 flex w-full items-center justify-center bg-primary py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary"
                  >
                    Order to start earning
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Elite Benefits */}
          {pointsOn && eliteBenefits.length > 0 && (
            <section className="border-b border-surface-container-highest px-5 py-7">
              <h3 className="font-display text-[18px] font-bold text-primary">
                Elite Benefits
              </h3>
              <ul className="mt-5 flex flex-col gap-5">
                {eliteBenefits.map((benefit) => (
                  <li
                    key={benefit.id}
                    className={`flex items-start gap-3.5 ${benefit.locked ? "opacity-45" : ""}`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center ${
                        benefit.locked
                          ? "border border-on-surface/20 text-on-surface-variant"
                          : "bg-primary text-on-primary"
                      }`}
                    >
                      <Icon name={benefit.icon} className="text-[22px]" filled={!benefit.locked} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="flex flex-wrap items-center gap-2 font-display text-[15px] font-bold text-primary">
                        <span>{benefit.title}</span>
                        {benefit.locked ? (
                          <span className="border border-on-surface/25 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
                            Locked
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">
                        {benefit.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Active Vouchers */}
          <section className="px-5 py-7">
            <h3 className="font-display text-[18px] font-bold text-primary">
              Active Vouchers
            </h3>

            {vouchers.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {vouchers.map((voucher) => {
                  const expiry = expiresInLabel(voucher.expiresAt);
                  const urgent =
                    voucher.status === "expiring_soon" ||
                    (expiry != null &&
                      !expiry.startsWith("Expired") &&
                      (expiry.includes("today") ||
                        expiry.includes("1 day") ||
                        /Expires in [2-5] days/.test(expiry)));
                  return (
                    <li
                      key={voucher.id}
                      className="border border-surface-container-highest bg-surface-container-lowest p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {voucher.code ? (
                          <span className="bg-surface-container px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                            {voucher.code}
                          </span>
                        ) : (
                          <span className="bg-surface-container px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                            {voucher.source === "stamp_card" ? "Stamp reward" : "Voucher"}
                          </span>
                        )}
                        {expiry ? (
                          <span
                            className={`shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
                              urgent ? "text-red-600" : "text-on-surface-variant"
                            }`}
                          >
                            {expiry}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 font-display text-[18px] font-bold leading-snug text-primary">
                        {voucher.name}
                      </p>
                      <p className="mt-1 text-[13px] text-on-surface-variant">
                        {voucher.description || "Valid for dine-in only."}
                      </p>
                      <Link
                        href={
                          voucher.code
                            ? `${routes.cart}?promo=${encodeURIComponent(voucher.code)}`
                            : routes.cart
                        }
                        className="mt-4 flex w-full items-center justify-center bg-primary py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-on-primary"
                      >
                        Apply to order
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-2 py-4 text-center">
                <Icon
                  name="confirmation_number"
                  className="text-[36px] text-on-surface-variant/30"
                />
                <p className="text-[13px] text-on-surface-variant">No active vouchers.</p>
              </div>
            )}

            {vouchers.length === 1 ? (
              <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
                <Icon
                  name="confirmation_number"
                  className="text-[28px] text-on-surface-variant/25"
                />
                <p className="text-[12px] text-on-surface-variant/70">
                  No other active vouchers.
                </p>
              </div>
            ) : null}

            {!tier && stampsOn && vouchers.length === 0 && (
              <p className="mt-4 text-center text-[13px] text-on-surface-variant">
                Join iRewards on WhatsApp after payment to collect stamps and vouchers.
              </p>
            )}
          </section>
        </main>
      )}

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
