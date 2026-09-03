"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";

type LevelOption = {
  levelNumber: number;
  name: string;
  perkDescription: string | null;
  pointsMultiplier: number;
  minLifetimePoints: number;
  welcomePoints: number;
};

type EnrollMeta = {
  merchant: { name: string; currency: "MYR" | "SGD"; stampsEnabled: boolean };
  levels: LevelOption[];
  defaultWelcomePoints: number;
  stampCardSize: number;
};

type EnrollNewMemberViewProps = {
  merchantSlug: string;
  onCancel: () => void;
  onEnrolled: (memberId: string) => void;
};

type DraftShape = {
  fullName: string;
  countryCode: "+60" | "+65";
  phoneLocal: string;
  email: string;
  birthday: string;
  staffNotes: string;
  levelNumber: number;
  initialPoints: number;
  initialStamps: number;
  sendWhatsApp: boolean;
  birthdayAutomation: boolean;
};

const DRAFT_PREFIX = "irewards-enroll-draft-";

function draftKey(slug: string) {
  return `${DRAFT_PREFIX}${slug}`;
}

function formatBirthdayInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function phoneE164(countryCode: string, local: string): string {
  const digits = local.replace(/\D/g, "");
  if (!digits) return "";
  if (local.trim().startsWith("+")) return local.trim().replace(/[\s()-]/g, "");
  const stripped = digits.replace(/^0+/, "");
  return `${countryCode}${stripped}`;
}

export function EnrollNewMemberView({
  merchantSlug,
  onCancel,
  onEnrolled,
}: EnrollNewMemberViewProps) {
  const [meta, setMeta] = useState<EnrollMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState<"+60" | "+65">("+60");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [levelNumber, setLevelNumber] = useState(1);
  const [initialPoints, setInitialPoints] = useState(50);
  const [initialStamps, setInitialStamps] = useState(0);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [birthdayAutomation, setBirthdayAutomation] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await merchantApi<EnrollMeta>(
        `/api/merchant/${merchantSlug}/customers?enrollMeta=1`,
      );
      setMeta(json);
      setCountryCode(json.merchant.currency === "SGD" ? "+65" : "+60");
      setInitialPoints(json.defaultWelcomePoints);
      setLevelNumber(json.levels[0]?.levelNumber ?? 1);

      try {
        const raw = window.localStorage.getItem(draftKey(merchantSlug));
        if (raw) {
          const draft = JSON.parse(raw) as DraftShape;
          setFullName(draft.fullName ?? "");
          setCountryCode(draft.countryCode ?? (json.merchant.currency === "SGD" ? "+65" : "+60"));
          setPhoneLocal(draft.phoneLocal ?? "");
          setEmail(draft.email ?? "");
          setBirthday(draft.birthday ?? "");
          setStaffNotes(draft.staffNotes ?? "");
          setLevelNumber(draft.levelNumber ?? json.levels[0]?.levelNumber ?? 1);
          setInitialPoints(draft.initialPoints ?? json.defaultWelcomePoints);
          setInitialStamps(draft.initialStamps ?? 0);
          setSendWhatsApp(draft.sendWhatsApp ?? false);
          setBirthdayAutomation(draft.birthdayAutomation ?? true);
        }
      } catch {
        /* ignore draft parse */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enroll form");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const phoneFull = useMemo(
    () => phoneE164(countryCode, phoneLocal),
    [countryCode, phoneLocal],
  );

  const nameOk = fullName.trim().length > 0;
  const phoneOk = phoneFull.length >= 10;
  const ready = nameOk && phoneOk;

  const previewName = fullName.trim() || "Kenzo Tanaka";
  const cafeName = meta?.merchant.name ?? "your cafe";
  const cardSize = meta?.stampCardSize ?? 8;
  const voucherCode = useMemo(() => {
    const base = cafeName.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 4) || "IRW";
    return `${base}010`;
  }, [cafeName]);

  function saveDraft() {
    const draft: DraftShape = {
      fullName,
      countryCode,
      phoneLocal,
      email,
      birthday,
      staffNotes,
      levelNumber,
      initialPoints,
      initialStamps,
      sendWhatsApp,
      birthdayAutomation,
    };
    window.localStorage.setItem(draftKey(merchantSlug), JSON.stringify(draft));
    setWarning(null);
    setError(null);
    setWarning("Draft saved on this device.");
  }

  async function enroll(mode: "manual" | "whatsapp") {
    if (!ready) {
      setError("Full name and phone are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setWarning(null);
    try {
      const json = await merchantApi<{
        member: { id: string };
        whatsappSent?: boolean;
        whatsappWarning?: string | null;
      }>(`/api/merchant/${merchantSlug}/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: fullName.trim(),
          phone: phoneFull,
          email: email.trim(),
          birthday: birthday.trim(),
          staffNotes: staffNotes.trim(),
          levelNumber,
          initialPoints,
          initialStamps: meta?.merchant.stampsEnabled ? initialStamps : 0,
          sendWhatsAppInvite: mode === "whatsapp",
          birthdayAutomation,
        }),
      });
      window.localStorage.removeItem(draftKey(merchantSlug));
      if (json.whatsappWarning) {
        setWarning(json.whatsappWarning);
      }
      onEnrolled(json.member.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll member");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-body-md text-on-surface-variant">Loading enroll form…</p>;
  }

  return (
    <div className="pb-28">
      <div className="mb-6 flex flex-col gap-3 border-b border-surface-container-highest pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Members › Add New Member
          </p>
          <h1 className="mt-1 font-display text-headline-lg text-primary">Enroll New Member</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            Member onboarding engine
          </p>
          <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
            Add an in-store customer manually, assign tier, initial points, and trigger a welcome
            WhatsApp invitation.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex shrink-0 items-center gap-1.5 border border-surface-container-highest px-3 py-2 font-display text-headline-sm text-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to Members
        </button>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800" role="alert">
          {error}
        </p>
      )}
      {warning && (
        <p className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-body-md text-amber-950">
          {warning}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Customer Details</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Step 01 / 03
              </span>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Full Name <span className="text-red-700">*</span>
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kenzo Tanaka"
                  className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2.5 text-body-md focus:border-primary focus:outline-none"
                />
              </label>

              <div>
                <span className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Phone Number <span className="text-red-700">*</span>
                  <span className="border border-surface-container-highest px-1.5 py-0.5 text-[9px] text-on-surface-variant">
                    Optional WhatsApp invite
                  </span>
                </span>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value as "+60" | "+65")}
                    className="shrink-0 border border-surface-container-highest bg-white px-2 py-2.5 text-body-md"
                  >
                    <option value="+60">+60 (MY)</option>
                    <option value="+65">+65 (SG)</option>
                  </select>
                  <input
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="12 345 6789"
                    inputMode="tel"
                    className="min-w-0 flex-1 border-0 border-b border-surface-container-highest bg-transparent py-2.5 font-mono text-body-md focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Email Address (optional)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2.5 text-body-md focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block max-w-xs">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Birthday Month &amp; Day
                </span>
                <input
                  value={birthday}
                  onChange={(e) => setBirthday(formatBirthdayInput(e.target.value))}
                  placeholder="dd/mm/yyyy"
                  className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2.5 font-mono text-body-md focus:border-primary focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Member Notes (internal staff only)
                </span>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  rows={3}
                  placeholder="Preferences, allergies, usual order…"
                  className="w-full border border-surface-container-highest bg-white px-3 py-2.5 text-body-md focus:border-primary focus:outline-none"
                />
              </label>
            </div>
          </section>

          <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">
                Loyalty &amp; Membership Setup
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Step 02 / 03
              </span>
            </div>

            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              Membership tier assignment
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(meta?.levels ?? []).slice(0, 3).map((level) => {
                const selected = levelNumber === level.levelNumber;
                return (
                  <button
                    key={level.levelNumber}
                    type="button"
                    onClick={() => {
                      setLevelNumber(level.levelNumber);
                      if (level.welcomePoints > 0) setInitialPoints(level.welcomePoints);
                    }}
                    className={`border p-4 text-left transition-colors ${
                      selected
                        ? "border-[#1a3d2e] bg-[#1a3d2e] text-white"
                        : "border-surface-container-highest bg-white hover:border-[#1a3d2e]/40"
                    }`}
                  >
                    <p className="font-display text-headline-sm">
                      Level {level.levelNumber}
                      {level.name ? ` · ${level.name}` : ""}
                    </p>
                    <p
                      className={`mt-2 text-[13px] leading-snug ${
                        selected ? "text-white/80" : "text-on-surface-variant"
                      }`}
                    >
                      {level.perkDescription?.trim() || "Membership tier"}
                    </p>
                    <p
                      className={`mt-3 font-mono text-[11px] uppercase tracking-wider ${
                        selected ? "text-white/90" : "text-on-surface-variant"
                      }`}
                    >
                      {level.pointsMultiplier.toFixed(1)}x point multiplier
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Initial points allocation
                </span>
                <div className="flex items-end gap-2 border-b border-surface-container-highest">
                  <input
                    type="number"
                    min={0}
                    value={initialPoints}
                    onChange={(e) => setInitialPoints(Number(e.target.value) || 0)}
                    className="w-full border-0 bg-transparent py-2.5 text-body-md focus:outline-none"
                  />
                  <span className="pb-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    PTS
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-on-surface-variant">
                  Default welcome enrollment points for this tier.
                </p>
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Initial coffee stamps
                </span>
                <div className="flex items-end gap-2 border-b border-surface-container-highest">
                  <input
                    type="number"
                    min={0}
                    max={cardSize}
                    disabled={!meta?.merchant.stampsEnabled}
                    value={initialStamps}
                    onChange={(e) => setInitialStamps(Number(e.target.value) || 0)}
                    className="w-full border-0 bg-transparent py-2.5 text-body-md focus:outline-none disabled:opacity-50"
                  />
                  <span className="pb-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                    / {cardSize} stamps
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-on-surface-variant">
                  {meta?.merchant.stampsEnabled
                    ? "Seed progress on their digital stamp card."
                    : "Turn on Stamps under iRewards to enable."}
                </p>
              </label>
            </div>

            <label className="mt-6 block max-w-md">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Preferred store / outlet <span className="text-red-700">*</span>
              </span>
              <select
                className="w-full border border-surface-container-highest bg-white px-3 py-2.5 text-body-md"
                defaultValue={cafeName}
              >
                <option value={cafeName}>{cafeName}</option>
              </select>
            </label>
          </section>
        </div>

        <div className="space-y-6">
          <section className="border border-surface-container-highest bg-surface-container-lowest p-6">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-headline-sm text-primary">Communications</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Step 03 / 03
              </span>
            </div>

            <label className="flex gap-3 border border-surface-container-highest bg-white p-3">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="mt-1 shrink-0"
              />
              <span>
                <span className="block font-display text-headline-sm text-primary">
                  Send WhatsApp invite
                </span>
                <span className="mt-1 block text-[13px] text-on-surface-variant">
                  Optional. Sends a welcome message and voucher hint — leave off for silent enroll.
                </span>
              </span>
            </label>

            <div className="mt-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                Simulated WhatsApp delivery
              </p>
              <div className="flex justify-center">
                {/* ~iPhone proportions: 390×844 → scaled ~220×476 */}
                <div
                  className="relative w-[min(100%,220px)] shrink-0 overflow-hidden rounded-[2rem] border-[3px] border-[#1c1c1e] bg-[#1c1c1e] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                  style={{ aspectRatio: "390 / 844" }}
                  aria-label="Phone preview of WhatsApp welcome message"
                >
                  {/* Side buttons (visual only) */}
                  <span className="absolute -left-[5px] top-[18%] h-8 w-[3px] rounded-l-sm bg-[#2c2c2e]" aria-hidden />
                  <span className="absolute -left-[5px] top-[28%] h-12 w-[3px] rounded-l-sm bg-[#2c2c2e]" aria-hidden />
                  <span className="absolute -right-[5px] top-[24%] h-16 w-[3px] rounded-r-sm bg-[#2c2c2e]" aria-hidden />

                  <div className="absolute inset-[3px] flex flex-col overflow-hidden rounded-[1.65rem] bg-[#0b141a]">
                    {/* Status bar */}
                    <div className="relative z-10 flex items-center justify-between px-4 pb-1 pt-2.5 text-[9px] font-medium text-white/90">
                      <span className="tabular-nums">9:41</span>
                      <span
                        className="absolute left-1/2 top-1.5 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-black"
                        aria-hidden
                      />
                      <span className="flex items-center gap-1 text-[8px]">
                        <Icon name="signal_cellular_alt" className="text-[10px]" />
                        <Icon name="wifi" className="text-[10px]" />
                        <Icon name="battery_full" className="text-[11px]" />
                      </span>
                    </div>

                    {/* Chat header */}
                    <div className="flex items-center gap-2 border-b border-white/5 bg-[#1f2c34] px-2.5 py-2">
                      <Icon name="arrow_back" className="text-[14px] text-[#53bdeb]" />
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[10px] font-semibold text-white">
                        iR
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold leading-tight text-white">
                          {cafeName}
                        </p>
                        <p className="text-[9px] leading-tight text-white/50">iRewards</p>
                      </div>
                      <Icon name="more_vert" className="text-[14px] text-white/70" />
                    </div>

                    {/* Chat thread */}
                    <div
                      className="relative flex-1 overflow-hidden px-2.5 py-3"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.025) 0, transparent 35%)",
                        backgroundColor: "#0b141a",
                      }}
                    >
                      <div className="mb-2 text-center">
                        <span className="rounded-md bg-[#182229] px-2 py-0.5 text-[8px] text-white/45">
                          Today
                        </span>
                      </div>
                      <div className="ml-auto max-w-[92%]">
                        <div className="relative rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-2 text-[10px] leading-[1.45] text-[#e9edef] shadow-sm">
                          <p className="font-medium">☕ Welcome to iRewards at {cafeName}!</p>
                          <p className="mt-1.5">Hello {previewName},</p>
                          <p className="mt-1.5">
                            Your digital membership pass is primed with {initialPoints} welcome
                            points.
                          </p>
                          <p className="mt-1.5">
                            Use code{" "}
                            <span className="font-mono font-semibold tracking-wide">
                              {voucherCode}
                            </span>{" "}
                            for a welcome treat on your next visit.
                          </p>
                          <p className="mt-1.5 flex items-center justify-end gap-1 text-[8px] text-white/45">
                            <span>9:41</span>
                            <Icon name="done_all" className="text-[10px] text-[#53bdeb]" />
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Composer stub */}
                    <div className="flex items-center gap-1.5 bg-[#1f2c34] px-2 py-2">
                      <div className="h-7 flex-1 rounded-full bg-[#2a3942] px-2.5 text-[9px] leading-7 text-white/35">
                        Message
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884]">
                        <Icon name="mic" className="text-[14px] text-white" />
                      </span>
                    </div>

                    {/* Home indicator */}
                    <div className="flex justify-center bg-[#1f2c34] pb-1.5 pt-0.5" aria-hidden>
                      <span className="h-[3px] w-24 rounded-full bg-white/35" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <label className="mt-5 flex gap-3 border border-surface-container-highest bg-white p-3">
              <input
                type="checkbox"
                checked={birthdayAutomation}
                onChange={(e) => setBirthdayAutomation(e.target.checked)}
                className="mt-1 shrink-0"
              />
              <span>
                <span className="block font-display text-headline-sm text-primary">
                  Birthday automation
                </span>
                <span className="mt-1 block text-[13px] text-on-surface-variant">
                  Auto-enroll in birthday campaigns when a birthday is set.
                </span>
              </span>
            </label>

            <div className="mt-5 flex gap-2 border border-surface-container-highest bg-surface-container-low px-3 py-3 text-[13px] text-on-surface-variant">
              <Icon name="lock" className="mt-0.5 shrink-0 text-[16px]" />
              <p>
                <span className="font-medium text-on-surface">PDPA &amp; data consent.</span> By
                enrolling, the customer consents to your terms and privacy policy for membership.
                WhatsApp is only sent if you turn the invite on.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-surface-container-highest bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
            <span
              className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-400"}`}
              aria-hidden
            />
            {ready
              ? sendWhatsApp
                ? "Ready to enroll and send WhatsApp invite"
                : "Ready to enroll (no WhatsApp invite)"
              : "Enter full name and phone to continue"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="border border-surface-container-highest px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
            >
              Save as draft
            </button>
            <button
              type="button"
              disabled={saving || !ready}
              onClick={() => void enroll(sendWhatsApp ? "whatsapp" : "manual")}
              className="inline-flex items-center gap-1.5 bg-[#1a1a1a] px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white disabled:opacity-50"
            >
              <Icon name={sendWhatsApp ? "send" : "person_add"} className="text-[16px]" />
              {saving
                ? "Enrolling…"
                : sendWhatsApp
                  ? "Enroll & send WhatsApp invite"
                  : "Enroll member"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
