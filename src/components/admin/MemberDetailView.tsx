"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";

type MemberDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  staffNotes?: string | null;
  tier: string;
  points: number;
  lifetimePoints: number;
  isMember: boolean;
  blocked: boolean;
  memberSince: string | null;
  lastVisit: string | null;
  lifetimeSpendCents: number;
  totalVisits: number;
  currency: "MYR" | "SGD";
  stampsCollected?: number;
  stampCardSize?: number | null;
  stampPendingReward?: boolean;
  stampsEnabled?: boolean;
};

type ActivityItem = {
  id: string;
  type: "order" | "voucher_redeemed" | "voucher_issued" | "points" | "whatsapp" | "feedback";
  title: string;
  at: string;
  description: string;
};

type VoucherItem = {
  id: string;
  name: string;
  description: string;
  expiresAt: string | null;
  status: "active" | "expiring_soon" | "redeemed" | "expired";
  icon: "local_bar" | "percent" | "loyalty" | "card_giftcard";
};

type CatalogPromo = {
  id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed";
  value: number;
  expiresAt: string | null;
  active: boolean;
};

type MemberDetailViewProps = {
  merchantSlug: string;
  memberId: string;
  onBack: () => void;
};

type ActionModal = "points" | "stamps" | "edit" | "voucher" | null;
type VoucherIssueMode = "existing" | "create";

function formatMoney(cents: number, currency: "MYR" | "SGD") {
  const symbol = currency === "SGD" ? "S$" : "RM";
  return `${symbol}${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBirthdayDisplay(month: number | null | undefined, day: number | null | undefined) {
  if (!month || !day) return "";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function formatBirthdayInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function splitPhone(phone: string | null, currency: "MYR" | "SGD"): {
  countryCode: "+60" | "+65";
  local: string;
} {
  const fallback: "+60" | "+65" = currency === "SGD" ? "+65" : "+60";
  if (!phone) return { countryCode: fallback, local: "" };
  const trimmed = phone.trim().replace(/[\s()-]/g, "");
  if (trimmed.startsWith("+65")) {
    return { countryCode: "+65", local: trimmed.slice(3) };
  }
  if (trimmed.startsWith("+60")) {
    return { countryCode: "+60", local: trimmed.slice(3) };
  }
  if (trimmed.startsWith("+")) {
    return { countryCode: fallback, local: trimmed };
  }
  return { countryCode: fallback, local: trimmed };
}

function phoneE164(countryCode: string, local: string): string {
  const digits = local.replace(/\D/g, "");
  if (!digits) return "";
  if (local.trim().startsWith("+")) return local.trim().replace(/[\s()-]/g, "");
  return `${countryCode}${digits.replace(/^0+/, "")}`;
}

function formatMemberSince(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function formatRelativeVisit(iso: string | null) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 Day Ago";
  if (days < 60) return `${days} Days Ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sameDay) return `TODAY, ${time}`;
  const date = d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
  return `${date}, ${time}`;
}

function formatExpiry(iso: string | null) {
  if (!iso) return "No expiry";
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function activityDotClass(type: ActivityItem["type"]) {
  switch (type) {
    case "order":
      return "bg-primary";
    case "voucher_redeemed":
      return "bg-emerald-600";
    case "voucher_issued":
      return "bg-violet-600";
    case "points":
      return "bg-amber-500";
    case "whatsapp":
      return "bg-sky-600";
    default:
      return "bg-on-surface-variant";
  }
}

function formatPromoValue(
  promo: Pick<CatalogPromo, "type" | "value">,
  currency: "MYR" | "SGD",
) {
  if (promo.type === "percentage") return `${promo.value}% off`;
  return `${currency === "SGD" ? "S$" : "RM"}${promo.value} off`;
}

function whatsappHref(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function MemberDetailView({ merchantSlug, memberId, onBack }: MemberDetailViewProps) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ActionModal>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pointsAmount, setPointsAmount] = useState("50");
  const [pointsReason, setPointsReason] = useState("");
  const [stampDelta, setStampDelta] = useState("1");
  const [editName, setEditName] = useState("");
  const [editCountryCode, setEditCountryCode] = useState<"+60" | "+65">("+60");
  const [editPhoneLocal, setEditPhoneLocal] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editStaffNotes, setEditStaffNotes] = useState("");
  const [voucherMode, setVoucherMode] = useState<VoucherIssueMode>("existing");
  const [catalogPromos, setCatalogPromos] = useState<CatalogPromo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [voucherSearch, setVoucherSearch] = useState("");
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [voucherName, setVoucherName] = useState("");
  const [voucherValue, setVoucherValue] = useState("15");
  const [voucherType, setVoucherType] = useState<"percentage" | "fixed">("percentage");

  const filteredCatalog = useMemo(() => {
    const q = voucherSearch.trim().toLowerCase();
    const active = catalogPromos.filter((p) => {
      if (!p.active) return false;
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false;
      return true;
    });
    if (!q) return active;
    return active.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogPromos, voucherSearch]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await merchantApi<{ promos: CatalogPromo[] }>(
        `/api/merchant/${merchantSlug}/promos`,
      );
      setCatalogPromos(data.promos);
    } catch {
      setCatalogPromos([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [merchantSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{
        member: MemberDetail;
        activity: ActivityItem[];
        vouchers: VoucherItem[];
      }>(`/api/merchant/${merchantSlug}/customers/${memberId}`);
      setMember(data.member);
      setActivity(data.activity);
      setVouchers(data.vouchers);
      setEditName(data.member.name);
      const split = splitPhone(data.member.phone, data.member.currency);
      setEditCountryCode(split.countryCode);
      setEditPhoneLocal(split.local);
      setEditEmail(data.member.email ?? "");
      setEditBirthday(
        formatBirthdayDisplay(data.member.birthdayMonth, data.member.birthdayDay),
      );
      setEditStaffNotes(data.member.staffNotes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(body: Record<string, unknown>) {
    setSaving(true);
    setActionError(null);
    try {
      const data = await merchantApi<{
        member: MemberDetail;
        activity: ActivityItem[];
        vouchers: VoucherItem[];
      }>(`/api/merchant/${merchantSlug}/customers/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setMember(data.member);
      setActivity(data.activity);
      setVouchers(data.vouchers);
      setModal(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-surface-container-highest bg-surface-container-lowest p-8">
        <p className="text-body-md text-on-surface-variant">Loading member…</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="border border-surface-container-highest bg-surface-container-lowest p-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-body-md text-on-surface-variant hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          Back to members
        </button>
        <p className="text-body-md text-red-800" role="alert">
          {error ?? "Member not found"}
        </p>
      </div>
    );
  }

  const wa = whatsappHref(member.phone);
  const activeVouchers = vouchers.filter(
    (v) => v.status === "active" || v.status === "expiring_soon",
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-body-md text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-base" />
        Back to members
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="flex flex-col border border-surface-container-highest bg-surface-container-lowest">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full bg-primary font-display text-3xl font-bold text-on-primary"
              aria-hidden
            >
              {initials(member.name)}
            </div>
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                {member.name}
              </h2>
              <p className="mt-2 inline-flex items-center gap-2 font-display text-eyebrow uppercase tracking-[0.2em] text-on-surface-variant">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                {member.tier} Tier
              </p>
              {member.phone && (
                <p className="mt-2 font-mono text-label-mono text-on-surface-variant">
                  {member.phone}
                </p>
              )}
            </div>
          </div>
          <div className="border-t border-surface-container-highest py-3 text-center font-display text-eyebrow uppercase tracking-[0.18em] text-on-surface-variant">
            Member since: {formatMemberSince(member.memberSince)}
          </div>
        </section>

        <section className="border border-surface-container-highest bg-surface-container-lowest">
          <div className="border-b border-surface-container-highest px-4 py-3">
            <h3 className="font-display text-eyebrow uppercase tracking-[0.2em] text-on-surface-variant">
              Actions
            </h3>
          </div>
          <ul className="divide-y divide-surface-container">
            <li>
              <button
                type="button"
                onClick={() => {
                  setVoucherMode("existing");
                  setVoucherSearch("");
                  setSelectedPromoId(null);
                  setVoucherName("");
                  setVoucherValue("15");
                  setVoucherType("percentage");
                  setActionError(null);
                  setModal("voucher");
                  void loadCatalog();
                }}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-primary hover:bg-surface-container-low"
              >
                Issue Voucher
                <Icon name="arrow_forward" className="text-lg text-on-surface-variant" />
              </button>
            </li>
            <li>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between px-4 py-3.5 text-body-md text-primary hover:bg-surface-container-low"
                >
                  Message User
                  <Icon name="chat_bubble" className="text-lg text-on-surface-variant" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-on-surface-variant opacity-50"
                  title="No phone on file"
                >
                  Message User
                  <Icon name="chat_bubble" className="text-lg" />
                </button>
              )}
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setPointsAmount("50");
                  setPointsReason("");
                  setActionError(null);
                  setModal("points");
                }}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-primary hover:bg-surface-container-low"
              >
                Manual Add Points
                <Icon name="add_circle" className="text-lg text-on-surface-variant" />
              </button>
            </li>
            {member.stampsEnabled && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setStampDelta("1");
                    setActionError(null);
                    setModal("stamps");
                  }}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-primary hover:bg-surface-container-low"
                >
                  Adjust Stamps
                  <Icon name="loyalty" className="text-lg text-on-surface-variant" />
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  const split = splitPhone(member.phone, member.currency);
                  setEditName(member.name);
                  setEditCountryCode(split.countryCode);
                  setEditPhoneLocal(split.local);
                  setEditEmail(member.email ?? "");
                  setEditBirthday(
                    formatBirthdayDisplay(member.birthdayMonth, member.birthdayDay),
                  );
                  setEditStaffNotes(member.staffNotes ?? "");
                  setActionError(null);
                  setModal("edit");
                }}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-primary hover:bg-surface-container-low"
              >
                Edit Profile
                <Icon name="edit" className="text-lg text-on-surface-variant" />
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void runAction({ action: "block", blocked: !member.blocked })
                }
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-body-md text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {member.blocked ? "Unblock User" : "Block User"}
                <Icon name="block" className="text-lg" />
              </button>
            </li>
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 border border-surface-container-highest bg-surface-container-lowest lg:grid-cols-4">
        {[
          {
            label: "Lifetime Spend",
            value: formatMoney(member.lifetimeSpendCents, member.currency),
          },
          { label: "Points Balance", value: member.points.toLocaleString() },
          {
            label: member.stampsEnabled ? "Stamps" : "Total Visits",
            value: member.stampsEnabled
              ? `${member.stampsCollected ?? 0}${
                  member.stampCardSize ? `/${member.stampCardSize}` : ""
                }${member.stampPendingReward ? " · reward" : ""}`
              : String(member.totalVisits),
          },
          { label: "Last Visit", value: formatRelativeVisit(member.lastVisit) },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`px-5 py-5 ${i > 0 ? "border-l border-surface-container-highest" : ""} ${
              i === 2 ? "border-t border-surface-container-highest lg:border-t-0" : ""
            } ${i === 3 ? "border-t border-surface-container-highest lg:border-t-0" : ""}`}
          >
            <p className="font-display text-eyebrow uppercase tracking-[0.18em] text-on-surface-variant">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="border border-surface-container-highest bg-surface-container-lowest p-5">
          <h3 className="mb-5 font-display text-eyebrow uppercase tracking-[0.2em] text-on-surface-variant">
            Activity Timeline
          </h3>
          {activity.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No activity yet.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-surface-container-highest pl-5">
              {activity.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${activityDotClass(item.type)}`}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-display text-headline-sm text-primary">{item.title}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
                      {formatActivityWhen(item.at)}
                    </p>
                  </div>
                  <p className="mt-1 text-body-md text-on-surface-variant">{item.description}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="border border-surface-container-highest bg-surface-container-lowest p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-eyebrow uppercase tracking-[0.2em] text-on-surface-variant">
              Active Vouchers
            </h3>
            <span className="border border-surface-container-highest bg-surface-container px-2 py-0.5 font-display text-[10px] uppercase tracking-wide text-on-surface-variant">
              {activeVouchers.length} Available
            </span>
          </div>
          {activeVouchers.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">No active vouchers.</p>
          ) : (
            <ul className="space-y-3">
              {activeVouchers.map((voucher) => (
                <li
                  key={voucher.id}
                  className="flex items-start justify-between gap-3 border border-surface-container-highest bg-surface-container-low p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-headline-sm text-primary">{voucher.name}</p>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {voucher.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
                        Expires: {formatExpiry(voucher.expiresAt)}
                      </span>
                      <span
                        className={`px-2 py-0.5 font-display text-[10px] uppercase tracking-wide ${
                          voucher.status === "expiring_soon"
                            ? "bg-red-700 text-white"
                            : "bg-primary text-on-primary"
                        }`}
                      >
                        {voucher.status === "expiring_soon" ? "Expiring Soon" : "Active"}
                      </span>
                    </div>
                  </div>
                  <Icon name={voucher.icon} className="shrink-0 text-2xl text-on-surface-variant" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg border border-surface-container-highest bg-surface-container-lowest p-5 shadow-lg">
            <h3 className="font-display text-headline-sm text-primary">
              {modal === "points" && "Manual Add Points"}
              {modal === "stamps" && "Adjust Stamps"}
              {modal === "edit" && "Edit Profile"}
              {modal === "voucher" && "Issue Voucher"}
            </h3>

            {modal === "points" && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                    Points
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                    disabled={saving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                    Reason (optional)
                  </span>
                  <input
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="e.g. goodwill adjustment"
                    className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                    disabled={saving}
                  />
                </label>
              </div>
            )}

            {modal === "stamps" && (
              <div className="mt-4 space-y-3">
                <p className="text-body-md text-on-surface-variant">
                  Current: {member.stampsCollected ?? 0}
                  {member.stampCardSize ? ` / ${member.stampCardSize}` : ""} stamps
                </p>
                <label className="block">
                  <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                    Delta (+ add / − void)
                  </span>
                  <input
                    type="number"
                    min={-20}
                    max={20}
                    value={stampDelta}
                    onChange={(e) => setStampDelta(e.target.value)}
                    className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                    disabled={saving}
                  />
                </label>
              </div>
            )}

            {modal === "edit" && (
              <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                <p className="text-[13px] text-on-surface-variant">
                  Same customer details as enroll — name, phone, email, birthday, staff notes.
                </p>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Full Name <span className="text-red-700">*</span>
                  </span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Kenzo Tanaka"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 text-body-md focus:border-primary focus:outline-none"
                    disabled={saving}
                  />
                </label>
                <div>
                  <span className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Phone Number <span className="text-red-700">*</span>
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={editCountryCode}
                      onChange={(e) => setEditCountryCode(e.target.value as "+60" | "+65")}
                      className="shrink-0 border border-surface-container-highest bg-white px-2 py-2 text-body-md"
                      disabled={saving}
                    >
                      <option value="+60">+60 (MY)</option>
                      <option value="+65">+65 (SG)</option>
                    </select>
                    <input
                      value={editPhoneLocal}
                      onChange={(e) => setEditPhoneLocal(e.target.value)}
                      placeholder="12 345 6789"
                      inputMode="tel"
                      className="min-w-0 flex-1 border-0 border-b border-surface-container-highest bg-transparent py-2 font-mono text-body-md focus:border-primary focus:outline-none"
                      disabled={saving}
                    />
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Email Address (optional)
                  </span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 text-body-md focus:border-primary focus:outline-none"
                    disabled={saving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Birthday Month &amp; Day
                  </span>
                  <input
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(formatBirthdayInput(e.target.value))}
                    placeholder="dd/mm/yyyy"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 font-mono text-body-md focus:border-primary focus:outline-none"
                    disabled={saving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                    Member Notes (internal staff only)
                  </span>
                  <textarea
                    value={editStaffNotes}
                    onChange={(e) => setEditStaffNotes(e.target.value)}
                    rows={3}
                    placeholder="Preferences, allergies, usual order…"
                    className="w-full border border-surface-container-highest bg-white px-3 py-2 text-body-md focus:border-primary focus:outline-none"
                    disabled={saving}
                  />
                </label>
              </div>
            )}

            {modal === "voucher" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-1 border border-surface-container-highest p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherMode("existing");
                      setActionError(null);
                    }}
                    className={`px-3 py-2 font-display text-eyebrow uppercase tracking-wide ${
                      voucherMode === "existing"
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    Select existing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherMode("create");
                      setSelectedPromoId(null);
                      setActionError(null);
                    }}
                    className={`px-3 py-2 font-display text-eyebrow uppercase tracking-wide ${
                      voucherMode === "create"
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    Create new
                  </button>
                </div>

                {voucherMode === "existing" ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                        Search vouchers
                      </span>
                      <div className="relative">
                        <Icon
                          name="search"
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-on-surface-variant"
                        />
                        <input
                          value={voucherSearch}
                          onChange={(e) => setVoucherSearch(e.target.value)}
                          placeholder="Search by name or code…"
                          className="w-full border border-surface-container-highest bg-surface-container-lowest py-2 pl-9 pr-3"
                          disabled={saving || catalogLoading}
                        />
                      </div>
                    </label>
                    <div className="max-h-56 overflow-y-auto border border-surface-container-highest">
                      {catalogLoading ? (
                        <p className="px-3 py-4 text-body-md text-on-surface-variant">
                          Loading vouchers…
                        </p>
                      ) : filteredCatalog.length === 0 ? (
                        <p className="px-3 py-4 text-body-md text-on-surface-variant">
                          No active vouchers found.
                          {voucherSearch ? " Try a different search." : " Create a new one."}
                        </p>
                      ) : (
                        <ul className="divide-y divide-surface-container">
                          {filteredCatalog.map((promo) => {
                            const selected = selectedPromoId === promo.id;
                            return (
                              <li key={promo.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPromoId(promo.id)}
                                  className={`flex w-full items-start justify-between gap-3 px-3 py-3 text-left hover:bg-surface-container-low ${
                                    selected ? "bg-surface-container-low" : ""
                                  }`}
                                  disabled={saving}
                                >
                                  <div className="min-w-0">
                                    <p className="font-display text-headline-sm text-primary">
                                      {promo.name}
                                    </p>
                                    <p className="mt-0.5 text-body-md text-on-surface-variant">
                                      {formatPromoValue(promo, member?.currency ?? "MYR")}
                                      {promo.code ? ` · ${promo.code}` : ""}
                                      {promo.expiresAt
                                        ? ` · Exp ${formatExpiry(promo.expiresAt)}`
                                        : ""}
                                    </p>
                                  </div>
                                  <Icon
                                    name={selected ? "radio_button_checked" : "radio_button_unchecked"}
                                    className={`shrink-0 text-xl ${selected ? "text-primary" : "text-on-surface-variant"}`}
                                  />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                        Voucher name
                      </span>
                      <input
                        value={voucherName}
                        onChange={(e) => setVoucherName(e.target.value)}
                        placeholder="e.g. Complimentary Dessert"
                        className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                        disabled={saving}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                          Type
                        </span>
                        <select
                          value={voucherType}
                          onChange={(e) =>
                            setVoucherType(e.target.value as "percentage" | "fixed")
                          }
                          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                          disabled={saving}
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed amount</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-display text-eyebrow uppercase text-on-surface-variant">
                          Value
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={voucherValue}
                          onChange={(e) => setVoucherValue(e.target.value)}
                          className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                          disabled={saving}
                        />
                      </label>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      Creates a new active promo (expires in 14 days) and issues it to this member.
                    </p>
                  </>
                )}
              </div>
            )}

            {actionError && (
              <p className="mt-3 text-body-md text-red-800" role="alert">
                {actionError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                className="border border-surface-container-highest px-4 py-2 text-body-md"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  saving ||
                  (modal === "voucher" &&
                    voucherMode === "existing" &&
                    !selectedPromoId)
                }
                onClick={() => {
                  if (modal === "points") {
                    const points = Number(pointsAmount);
                    if (!Number.isFinite(points) || points < 1) {
                      setActionError("Enter a valid points amount");
                      return;
                    }
                    void runAction({
                      action: "add_points",
                      points,
                      reason: pointsReason.trim() || undefined,
                    });
                  } else if (modal === "stamps") {
                    const delta = Number(stampDelta);
                    if (!Number.isFinite(delta) || delta === 0) {
                      setActionError("Enter a non-zero stamp delta");
                      return;
                    }
                    void runAction({
                      action: "adjust_stamps",
                      delta,
                    });
                  } else if (modal === "edit") {
                    if (!editName.trim()) {
                      setActionError("Full name is required");
                      return;
                    }
                    const phone = phoneE164(editCountryCode, editPhoneLocal);
                    if (!phone) {
                      setActionError("Phone is required");
                      return;
                    }
                    void runAction({
                      action: "edit_profile",
                      name: editName.trim(),
                      phone,
                      email: editEmail.trim() || null,
                      birthday: editBirthday.trim(),
                      staffNotes: editStaffNotes.trim(),
                    });
                  } else if (modal === "voucher") {
                    if (voucherMode === "existing") {
                      if (!selectedPromoId) {
                        setActionError("Select a voucher to issue");
                        return;
                      }
                      void runAction({
                        action: "issue_voucher",
                        promoId: selectedPromoId,
                      });
                    } else {
                      if (!voucherName.trim()) {
                        setActionError("Voucher name is required");
                        return;
                      }
                      const value = Number(voucherValue);
                      if (!Number.isFinite(value) || value <= 0) {
                        setActionError("Enter a valid value");
                        return;
                      }
                      void runAction({
                        action: "create_and_issue_voucher",
                        name: voucherName.trim(),
                        type: voucherType,
                        value,
                        expiryDays: 14,
                      });
                    }
                  }
                }}
                className="bg-primary px-4 py-2 text-body-md text-on-primary disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : modal === "voucher"
                    ? "Issue"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
