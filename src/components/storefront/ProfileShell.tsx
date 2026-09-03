"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CustomerMobileNav } from "@/components/customer/CustomerMobileNav";
import { StorefrontLanguagePicker } from "@/components/storefront/StorefrontLanguagePicker";
import { Icon } from "@/components/ui/Icon";
import { MobileShell } from "@/components/ui/MobileShell";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useStorefrontLocale } from "@/hooks/useStorefrontLocale";
import { useStorefrontMenu } from "@/hooks/useStorefrontMenu";
import { useTableCart } from "@/hooks/useTableCart";
import { legalPolicyPath } from "@/lib/merchant/legal-policies";
import { helpCenterPath } from "@/lib/storefront/help-center";
import { customerRoutes } from "@/lib/navigation/routes";

type ProfileShellProps = {
  merchantSlug: string;
  tableId: string;
};

type NotifPrefs = {
  orderUpdates: boolean;
  pointsAlerts: boolean;
  exclusiveDrops: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  orderUpdates: true,
  pointsAlerts: true,
  exclusiveDrops: false,
};

function prefsKey(merchantSlug: string, memberId: string | null) {
  return `irewards-profile-notifs:${merchantSlug}:${memberId ?? "guest"}`;
}

function formatDisplayPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const raw = phone.trim().replace(/^whatsapp:/i, "");
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("60") && digits.length >= 11) {
    const local = digits.slice(2);
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5)}`;
  }
  if (digits.startsWith("65") && digits.length >= 10) {
    const local = digits.slice(2);
    return `+65 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return raw.startsWith("+") ? raw : `+${digits}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ProfileToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-surface-container-high"
      }`}
    >
      <span
        className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 px-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-on-surface-variant">
      {children}
    </h2>
  );
}

function RowShell({
  children,
  onClick,
  href,
  external,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container-low";

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function ProfileShell({ merchantSlug, tableId }: ProfileShellProps) {
  const { lang, setLang, copy } = useStorefrontLocale(merchantSlug, ["en", "zh", "ms"]);
  const { languages, merchantName } = useStorefrontMenu(merchantSlug, lang);
  const { member, loading, signOut } = useMemberSession();
  const { serviceType } = useTableCart(merchantSlug, tableId);
  const routes = customerRoutes(merchantSlug, tableId);

  const [tierName, setTierName] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [signingOut, setSigningOut] = useState(false);
  const [panel, setPanel] = useState<"edit" | "phone" | null>(null);

  const serviceLabel = serviceType === "takeaway" ? "Takeaway" : "Dine-in";
  const displayName =
    member?.displayName?.trim() || (member ? "iRewards member" : loading ? "…" : "Guest diner");
  const phoneDisplay = formatDisplayPhone(member?.phone);
  const privacyHref = legalPolicyPath(merchantSlug, "privacy");
  const refundHref = legalPolicyPath(merchantSlug, "refund");
  const helpHref = helpCenterPath(merchantSlug);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey(merchantSlug, member?.id ?? null));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotifPrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
        return;
      }
    } catch {
      /* ignore */
    }
    if (member?.marketingOptOut) {
      setPrefs({ orderUpdates: true, pointsAlerts: false, exclusiveDrops: false });
    } else {
      setPrefs(DEFAULT_PREFS);
    }
  }, [merchantSlug, member?.id, member?.marketingOptOut]);

  const persistPrefs = useCallback(
    (next: NotifPrefs) => {
      setPrefs(next);
      try {
        localStorage.setItem(prefsKey(merchantSlug, member?.id ?? null), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [merchantSlug, member?.id],
  );

  useEffect(() => {
    if (!member?.id) {
      setTierName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/customers/${member.id}/tier`)
      .then((res) => res.json())
      .then((json: { currentLevel?: { name?: string } }) => {
        if (!cancelled && json.currentLevel?.name) setTierName(json.currentLevel.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  const tierLabel = useMemo(() => {
    if (!member) return null;
    return (tierName ?? "Member").toUpperCase();
  }, [member, tierName]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(merchantSlug);
      setPanel(null);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <MobileShell showPdpa={false}>
      <header className="px-5 pb-2 pt-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight text-primary">
              {merchantName || merchantSlug}
            </h1>
            <p className="mt-0.5 text-[13px] text-on-surface-variant">
              {copy.table} {tableId} · {serviceLabel}
            </p>
          </div>
          {languages.length > 1 && (
            <StorefrontLanguagePicker languages={languages} value={lang} onChange={setLang} />
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-[32px] font-bold leading-none tracking-tight text-primary">
            {copy.profile}
          </h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center text-primary"
            aria-label="Settings"
            onClick={() => {
              document.getElementById("profile-account")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Icon name="settings" className="text-[22px]" />
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-7 px-5 pb-28 pt-4">
        <section className="flex flex-col items-center pt-2 text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-container-high text-on-surface">
              {member ? (
                <span className="font-display text-[28px] font-bold tracking-tight">
                  {initials(displayName)}
                </span>
              ) : (
                <Icon name="person" className="text-[40px] text-on-surface-variant" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setPanel("edit")}
              className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm"
              aria-label="Edit profile photo"
            >
              <Icon name="edit" className="text-[14px]" />
            </button>
          </div>
          <p className="mt-4 font-display text-[26px] font-bold leading-tight tracking-tight text-primary">
            {displayName}
          </p>
          {tierLabel && (
            <p className="mt-2 flex items-center justify-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              <Icon name="verified_user" className="text-[14px]" />
              {tierLabel}
            </p>
          )}
          {!member && !loading && (
            <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-on-surface-variant">
              Join iRewards after your order to save points and preferences.
            </p>
          )}
        </section>

        <section id="profile-account">
          <SectionLabel>Account</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest">
            <RowShell onClick={() => setPanel("edit")}>
              <Icon name="person" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Edit Profile
              </span>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </RowShell>
            <div className="mx-4 border-t border-surface-container" />
            <RowShell onClick={() => setPanel("phone")}>
              <Icon name="smartphone" className="text-[22px] text-on-surface" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-semibold text-primary">
                  Phone Number
                </span>
                <span className="mt-0.5 block text-[12px] text-on-surface-variant">
                  {phoneDisplay ?? (member ? "Not on file" : "Join to add WhatsApp")}
                </span>
              </span>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </RowShell>
          </div>
        </section>

        <section>
          <SectionLabel>Notifications</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Icon name="receipt_long" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Order Updates
              </span>
              <ProfileToggle
                label="Order Updates"
                checked={prefs.orderUpdates}
                onChange={(v) => persistPrefs({ ...prefs, orderUpdates: v })}
              />
            </div>
            <div className="mx-4 border-t border-surface-container" />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Icon name="star" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Points & Reward Alerts
              </span>
              <ProfileToggle
                label="Points & Reward Alerts"
                checked={prefs.pointsAlerts}
                onChange={(v) => persistPrefs({ ...prefs, pointsAlerts: v })}
              />
            </div>
            <div className="mx-4 border-t border-surface-container" />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Icon name="local_fire_department" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Exclusive Drops
              </span>
              <ProfileToggle
                label="Exclusive Drops"
                checked={prefs.exclusiveDrops}
                onChange={(v) => persistPrefs({ ...prefs, exclusiveDrops: v })}
              />
            </div>
          </div>
        </section>

        <section>
          <SectionLabel>Support & Legal</SectionLabel>
          <div className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest">
            <RowShell href={privacyHref}>
              <Icon name="shield" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Privacy Policy
              </span>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </RowShell>
            <div className="mx-4 border-t border-surface-container" />
            <RowShell href={refundHref}>
              <Icon name="gavel" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Refund Policy
              </span>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </RowShell>
            <div className="mx-4 border-t border-surface-container" />
            <RowShell href={helpHref}>
              <Icon name="help_outline" className="text-[22px] text-on-surface" />
              <span className="flex-1 font-display text-[15px] font-semibold text-primary">
                Help Center
              </span>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </RowShell>
          </div>
        </section>

        {member && (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 border border-primary bg-surface-container-lowest py-3.5 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-surface-container-low disabled:opacity-60"
          >
            <Icon name="logout" className="text-[18px]" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        )}

        {!member && !loading && (
          <Link
            href={routes.shop}
            className="flex w-full items-center justify-center gap-2 border border-primary bg-primary py-3.5 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-on-primary"
          >
            Browse menu
          </Link>
        )}
      </main>

      {panel && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
          onClick={() => setPanel(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-mobile border-t border-surface-container-highest bg-surface-container-lowest px-5 pb-10 pt-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-primary">
                {panel === "edit" && "Edit Profile"}
                {panel === "phone" && "Phone Number"}
              </h3>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="flex h-8 w-8 items-center justify-center text-on-surface-variant"
                aria-label="Close"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            {panel === "edit" && (
              <div className="space-y-3 text-[13px] leading-relaxed text-on-surface-variant">
                <p>
                  <span className="font-semibold text-primary">Name:</span> {displayName}
                </p>
                {tierLabel && (
                  <p>
                    <span className="font-semibold text-primary">Tier:</span> {tierLabel}
                  </p>
                )}
                <p>
                  Ask cafe staff to update your membership details, or message the cafe on WhatsApp.
                </p>
                <Link
                  href={routes.rewards}
                  className="mt-2 inline-flex items-center gap-1 font-display text-[14px] font-semibold text-primary"
                  onClick={() => setPanel(null)}
                >
                  View rewards
                  <Icon name="chevron_right" className="text-[18px]" />
                </Link>
              </div>
            )}
            {panel === "phone" && (
              <div className="space-y-3 text-[13px] leading-relaxed text-on-surface-variant">
                <p className="font-display text-[20px] font-bold text-primary">
                  {phoneDisplay ?? "No number on file"}
                </p>
                <p>
                  {member
                    ? "Your WhatsApp number is used for order updates and iRewards messages. Reply STOP anytime to opt out."
                    : "Join iRewards after payment to link your WhatsApp, or enter your number on the menu if you already joined."}
                </p>
                {!member && (
                  <Link
                    href={routes.shop}
                    className="mt-2 inline-flex items-center gap-1 font-display text-[14px] font-semibold text-primary"
                    onClick={() => setPanel(null)}
                  >
                    Back to menu
                    <Icon name="chevron_right" className="text-[18px]" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <CustomerMobileNav
        merchantSlug={merchantSlug}
        tableId={tableId}
        active="profile"
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
