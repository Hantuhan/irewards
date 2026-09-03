"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DinerFlowPreview } from "@/components/admin/DinerFlowPreview";
import { UpsellRuleEditor } from "@/components/admin/UpsellRuleEditor";
import type { UpsellLinkConfig } from "@/lib/menu/upsell-rules";
import { AdminShell } from "@/components/admin/AdminShell";
import { TeamSettingsPanel } from "@/components/admin/TeamSettingsPanel";
import { ReceiptEditor, createDefaultReceiptLayout } from "@/components/receipt/ReceiptEditor";
import { AiAssistTextarea } from "@/components/ui/AiAssistTextarea";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { dashboardRoutes } from "@/lib/navigation/routes";
import { legalPolicyPath } from "@/lib/merchant/legal-policies";
import { syncTaxFlagsForCurrency } from "@/lib/merchant/charge-settings";
import { resolveLegalPolicyDefaults } from "@/lib/merchant/default-legal-policies";
import { parseReceiptLayout, type ReceiptLayout } from "@/lib/receipt/layout";

type SettingsAdminShellProps = { merchantSlug: string };

type TabId = "store" | "checkout" | "online" | "receipt" | "legal" | "flow" | "team";

const TABS: { id: TabId; label: string }[] = [
  { id: "store", label: "Store" },
  { id: "checkout", label: "Checkout" },
  { id: "online", label: "Social" },
  { id: "receipt", label: "Receipt" },
  { id: "legal", label: "Legal" },
  { id: "flow", label: "Diner flow" },
  { id: "team", label: "Team" },
];

type SettingsData = {
  name: string;
  logoUrl: string;
  address: string;
  googleUrl: string;
  latitude: string;
  longitude: string;
  languages: string[];
  registrationNumber: string;
  sstNumber: string;
  gstNumber: string;
  landlineNumber: string;
  whatsappNumber: string;
  currency: "MYR" | "SGD";
  facebookUrl: string;
  instagramUrl: string;
  xhsUrl: string;
  websiteUrl: string;
  storeEmail: string;
  serviceChargeEnabled: boolean;
  serviceChargePercent: number;
  sstEnabled: boolean;
  sstRatePercent: number;
  gstEnabled: boolean;
  gstRatePercent: number;
  receiptFooterText: string;
  receiptShowRegistration: boolean;
  refundPolicy: string;
  privacyPolicy: string;
  globalUpsellLinks: UpsellLinkConfig[];
  dailyRevenueTarget: string;
  weeklyRevenueTarget: string;
  monthlyRevenueTarget: string;
  halalCertified: boolean | null;
  halalCertificateUrl: string;
};

type SocialField = {
  key: keyof Pick<
    SettingsData,
    "facebookUrl" | "instagramUrl" | "xhsUrl" | "websiteUrl" | "storeEmail"
  >;
  icon: "facebook" | "instagram" | "google" | "xhs" | "web" | "email";
  label: string;
  placeholder: string;
  inputType?: string;
};

const SOCIAL_FIELDS: SocialField[] = [
  {
    key: "facebookUrl",
    icon: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/your-cafe",
  },
  {
    key: "instagramUrl",
    icon: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/your-cafe",
  },
  {
    key: "xhsUrl",
    icon: "xhs",
    label: "Xiaohongshu (XHS)",
    placeholder: "https://xiaohongshu.com/user/profile/...",
  },
  {
    key: "websiteUrl",
    icon: "web",
    label: "Website",
    placeholder: "https://yourcafe.com",
  },
  {
    key: "storeEmail",
    icon: "email",
    label: "Email",
    placeholder: "hello@yourcafe.com",
    inputType: "email",
  },
];

const inputClass = "mt-2 w-full border border-surface-container-highest px-3 py-2";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
  { code: "ms", label: "Bahasa Malaysia" },
] as const;

const storeFieldGridClass = "grid gap-3 md:grid-cols-[minmax(0,200px)_1fr] md:items-start md:gap-6";

function SettingsCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-surface-container-highest bg-surface-container-low p-5 md:p-6 ${className}`}
    >
      <div className="mb-4">
        <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string | boolean | null>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string; icon?: string }[];
  columns?: 2 | 3;
}) {
  const colClass =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-3";
  return (
    <div className={`grid gap-2 ${colClass}`} role="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors ${
              selected
                ? "border-primary bg-surface-container-lowest text-primary ring-2 ring-primary ring-inset"
                : "border-surface-container-highest bg-surface-container-lowest text-on-surface-variant hover:border-primary/40"
            }`}
          >
            <span className="flex items-center gap-2 font-display text-headline-sm">
              {option.icon && (
                <Icon
                  name={option.icon}
                  className={`text-lg ${selected ? "text-primary" : "text-on-surface-variant"}`}
                />
              )}
              {option.label}
            </span>
            {option.hint && (
              <span className="text-body-md text-on-surface-variant">{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsAdminShell({ merchantSlug }: SettingsAdminShellProps) {
  const routes = dashboardRoutes(merchantSlug);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const halalCertInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("store");
  const [settings, setSettings] = useState<SettingsData>({
    name: "",
    logoUrl: "",
    address: "",
    googleUrl: "",
    latitude: "",
    longitude: "",
    languages: ["en"],
    registrationNumber: "",
    sstNumber: "",
    gstNumber: "",
    landlineNumber: "",
    whatsappNumber: "",
    currency: "MYR",
    facebookUrl: "",
    instagramUrl: "",
    xhsUrl: "",
    websiteUrl: "",
    storeEmail: "",
    serviceChargeEnabled: false,
    serviceChargePercent: 10,
    sstEnabled: false,
    sstRatePercent: 6,
    gstEnabled: false,
    gstRatePercent: 9,
    receiptFooterText: "",
    receiptShowRegistration: true,
    refundPolicy: "",
    privacyPolicy: "",
    globalUpsellLinks: [],
    dailyRevenueTarget: "",
    weeklyRevenueTarget: "",
    monthlyRevenueTarget: "",
    halalCertified: null,
    halalCertificateUrl: "",
  });
  const [checkoutProducts, setCheckoutProducts] = useState<
    { slug: string; name: string; categoryLabel?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHalalCert, setUploadingHalalCert] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [receiptLayout, setReceiptLayout] = useState<ReceiptLayout>(createDefaultReceiptLayout());

  const load = useCallback(async () => {
    const data = await merchantApi<{
      name: string;
      logoUrl: string | null;
      address: string | null;
      googleUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      languages: string[];
      registrationNumber: string | null;
      sstNumber: string | null;
      gstNumber: string | null;
      landlineNumber: string | null;
      whatsappNumber: string | null;
      currency: "MYR" | "SGD";
      facebookUrl: string | null;
      instagramUrl: string | null;
      xhsUrl: string | null;
      websiteUrl: string | null;
      storeEmail: string | null;
      serviceChargeEnabled: boolean;
      serviceChargePercent: number;
      sstEnabled: boolean;
      sstRatePercent: number;
      gstEnabled: boolean;
      gstRatePercent: number;
      receiptFooterText: string | null;
      receiptShowRegistration: boolean;
      receiptLayout: unknown;
      refundPolicy: string | null;
      privacyPolicy: string | null;
      globalUpsellLinks?: UpsellLinkConfig[];
      globalUpsellItemSlugs?: string[];
      dailyRevenueTargetCents?: number | null;
      weeklyRevenueTargetCents?: number | null;
      monthlyRevenueTargetCents?: number | null;
      halalCertified?: boolean | null;
      halalCertificateUrl?: string | null;
    }>(`/api/merchant/${merchantSlug}/settings`);

    const menuData = await merchantApi<{
      categories: { slug: string; label: string }[];
      items: { slug: string; name: string; categorySlug: string }[];
    }>(`/api/merchant/${merchantSlug}/menu`);
    const categoryLabels = new Map(menuData.categories.map((c) => [c.slug, c.label]));
    setCheckoutProducts(
      menuData.items.map((item) => ({
        slug: item.slug,
        name: item.name,
        categoryLabel: categoryLabels.get(item.categorySlug),
      })),
    );
    const policyDefaults = resolveLegalPolicyDefaults({
      merchantName: data.name,
      currency: data.currency,
      storeEmail: data.storeEmail,
    });
    setSettings({
      name: data.name,
      logoUrl: data.logoUrl ?? "",
      address: data.address ?? "",
      googleUrl: data.googleUrl ?? "",
      latitude: data.latitude != null ? String(data.latitude) : "",
      longitude: data.longitude != null ? String(data.longitude) : "",
      languages: data.languages?.length ? data.languages : ["en"],
      registrationNumber: data.registrationNumber ?? "",
      sstNumber: data.sstNumber ?? "",
      gstNumber: data.gstNumber ?? "",
      landlineNumber: data.landlineNumber ?? "",
      currency: data.currency,
      whatsappNumber: data.whatsappNumber ?? "",
      facebookUrl: data.facebookUrl ?? "",
      instagramUrl: data.instagramUrl ?? "",
      xhsUrl: data.xhsUrl ?? "",
      websiteUrl: data.websiteUrl ?? "",
      storeEmail: data.storeEmail ?? "",
      serviceChargeEnabled: data.serviceChargeEnabled ?? false,
      serviceChargePercent: data.serviceChargePercent ?? 10,
      sstEnabled: data.sstEnabled ?? false,
      sstRatePercent: data.sstRatePercent ?? 6,
      gstEnabled: data.gstEnabled ?? false,
      gstRatePercent: data.gstRatePercent ?? 9,
      receiptFooterText: data.receiptFooterText ?? "",
      receiptShowRegistration: data.receiptShowRegistration ?? true,
      refundPolicy: data.refundPolicy?.trim() || policyDefaults.refundPolicy,
      privacyPolicy: data.privacyPolicy?.trim() || policyDefaults.privacyPolicy,
      globalUpsellLinks:
        data.globalUpsellLinks ??
        (data.globalUpsellItemSlugs ?? []).map((slug) => ({
          slug,
          suggestType: "upsell" as const,
          promoMode: "regular" as const,
          ruleType: "always" as const,
          priority: 10,
        })),
      dailyRevenueTarget:
        data.dailyRevenueTargetCents != null
          ? (data.dailyRevenueTargetCents / 100).toFixed(2)
          : "",
      weeklyRevenueTarget:
        data.weeklyRevenueTargetCents != null
          ? (data.weeklyRevenueTargetCents / 100).toFixed(2)
          : "",
      monthlyRevenueTarget:
        data.monthlyRevenueTargetCents != null
          ? (data.monthlyRevenueTargetCents / 100).toFixed(2)
          : "",
      halalCertified: data.halalCertified ?? null,
      halalCertificateUrl: data.halalCertificateUrl ?? "",
    });
    setReceiptLayout(parseReceiptLayout(data.receiptLayout) ?? createDefaultReceiptLayout());
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => {
      if (key === "currency") {
        return {
          ...prev,
          currency: value as SettingsData["currency"],
          ...syncTaxFlagsForCurrency(value as SettingsData["currency"]),
        };
      }
      return { ...prev, [key]: value };
    });
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/merchant/${merchantSlug}/settings/logo/upload`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      updateField("logoUrl", json.url ?? "");
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  function toggleLanguage(code: string) {
    setSettings((prev) => {
      const selected = prev.languages.includes(code);
      if (selected) {
        if (prev.languages.length === 1) return prev;
        return { ...prev, languages: prev.languages.filter((l) => l !== code) };
      }
      return { ...prev, languages: [...prev.languages, code] };
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateField("latitude", String(pos.coords.latitude));
        updateField("longitude", String(pos.coords.longitude));
        setLocating(false);
      },
      (err) => {
        setError(err.message || "Could not get your location.");
        setLocating(false);
      },
    );
  }

  async function uploadHalalCert(file: File) {
    setUploadingHalalCert(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `/api/merchant/${merchantSlug}/settings/halal-cert/upload`,
        { method: "POST", body, credentials: "include" },
      );
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      updateField("halalCertificateUrl", json.url ?? "");
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Certificate upload failed");
    } finally {
      setUploadingHalalCert(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSaved(false);
    if (settings.halalCertified === true && !settings.halalCertificateUrl.trim()) {
      setError("Upload your halal certificate when declaring Halal certified.");
      setSaving(false);
      return;
    }
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          name: settings.name,
          logoUrl: settings.logoUrl || null,
          address: settings.address || null,
          googleUrl: settings.googleUrl || null,
          latitude: settings.latitude ? Number(settings.latitude) : null,
          longitude: settings.longitude ? Number(settings.longitude) : null,
          languages: settings.languages,
          registrationNumber: settings.registrationNumber || null,
          sstNumber: settings.sstNumber || null,
          gstNumber: settings.gstNumber || null,
          landlineNumber: settings.landlineNumber || null,
          whatsappNumber: settings.whatsappNumber || null,
          currency: settings.currency,
          facebookUrl: settings.facebookUrl || null,
          instagramUrl: settings.instagramUrl || null,
          xhsUrl: settings.xhsUrl || null,
          websiteUrl: settings.websiteUrl || null,
          storeEmail: settings.storeEmail || null,
          serviceChargeEnabled: settings.serviceChargeEnabled,
          serviceChargePercent: settings.serviceChargePercent,
          sstEnabled: settings.sstEnabled,
          sstRatePercent: settings.sstRatePercent,
          gstEnabled: settings.gstEnabled,
          gstRatePercent: settings.gstRatePercent,
          receiptFooterText: settings.receiptFooterText || null,
          receiptShowRegistration: settings.receiptShowRegistration,
          receiptLayout,
          refundPolicy: settings.refundPolicy || null,
          privacyPolicy: settings.privacyPolicy || null,
          globalUpsellLinks: settings.globalUpsellLinks,
          dailyRevenueTarget: settings.dailyRevenueTarget
            ? Number(settings.dailyRevenueTarget)
            : null,
          weeklyRevenueTarget: settings.weeklyRevenueTarget
            ? Number(settings.weeklyRevenueTarget)
            : null,
          monthlyRevenueTarget: settings.monthlyRevenueTarget
            ? Number(settings.monthlyRevenueTarget)
            : null,
          halalCertified: settings.halalCertified,
          halalCertificateUrl:
            settings.halalCertified === true ? settings.halalCertificateUrl || null : null,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const policyDefaults = useCallback(
    () =>
      resolveLegalPolicyDefaults({
        merchantName: settings.name || "Your Cafe",
        currency: settings.currency,
        storeEmail: settings.storeEmail,
      }),
    [settings.name, settings.currency, settings.storeEmail],
  );

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="settings"
      title="Store settings"
      eyebrow="Configuration"
      headerAction={
        tab !== "flow" ? (
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        ) : undefined
      }
    >
      {saved && <p className="mb-4 text-emerald-700">Settings saved.</p>}
      {error && <p className="mb-4 text-red-700">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-surface-container-highest">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-mono text-label-mono uppercase ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`flex flex-col gap-10 ${
          tab === "legal" || tab === "store" || tab === "checkout" || tab === "flow"
            ? "max-w-6xl"
            : tab === "receipt"
              ? ""
              : "max-w-xl"
        }`}
      >
        {tab === "store" && (
          <section className="flex flex-col gap-8">
            <SettingsCard title="Branding" description="Your logo and store name appear on receipts and the diner menu.">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-surface-container-highest bg-surface-container-lowest transition-colors hover:border-primary/50"
                  >
                    {settings.logoUrl ? (
                      <>
                        <Image
                          src={settings.logoUrl}
                          alt="Store logo"
                          fill
                          className="object-contain p-3"
                          unoptimized
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-on-surface/60 font-display text-eyebrow uppercase text-on-primary opacity-0 transition-opacity group-hover:opacity-100">
                          Change
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-2 text-center text-on-surface-variant">
                        <Icon name="add_photo_alternate" className="text-3xl" />
                        <span className="font-mono text-[10px] uppercase tracking-wide">
                          Add logo
                        </span>
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-on-surface">
                      Square or wide logo works best. PNG, JPG, WebP, or SVG.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-display text-eyebrow uppercase text-on-primary disabled:opacity-50"
                      >
                        <Icon name="upload" className="text-base" />
                        {uploadingLogo ? "Uploading…" : settings.logoUrl ? "Replace logo" : "Upload logo"}
                      </button>
                      {settings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => updateField("logoUrl", "")}
                          className="border border-surface-container-highest px-4 py-2 font-display text-eyebrow uppercase text-on-surface-variant"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file);
                    e.target.value = "";
                  }}
                />

                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    Store name
                  </span>
                  <input
                    value={settings.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your cafe or restaurant name"
                    className={inputClass}
                  />
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Halal certification"
              description="Shown on your menu so diners can see Halal vs Contains pork labels."
            >
              <SegmentedControl
                value={settings.halalCertified}
                onChange={(value) => {
                  setSettings((prev) => ({
                    ...prev,
                    halalCertified: value,
                    halalCertificateUrl: value === true ? prev.halalCertificateUrl : "",
                  }));
                  setSaved(false);
                }}
                options={[
                  {
                    value: null,
                    label: "Not declared",
                    hint: "No badge shown yet",
                    icon: "help_outline",
                  },
                  {
                    value: true,
                    label: "Halal certified",
                    hint: "Upload certificate",
                    icon: "verified",
                  },
                  {
                    value: false,
                    label: "Not halal",
                    hint: "Outlet is not halal",
                    icon: "block",
                  },
                ]}
              />

              {settings.halalCertified === true && (
                <div className="mt-4 border border-surface-container-highest bg-surface-container-lowest p-4">
                  <p className="text-body-md text-on-surface-variant">
                    Upload your JAKIM / MUIS / relevant halal certificate (PDF or image, max 5 MB).
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => halalCertInputRef.current?.click()}
                      disabled={uploadingHalalCert}
                      className="inline-flex items-center gap-2 border border-primary px-4 py-2 text-primary disabled:opacity-50"
                    >
                      <Icon name="upload_file" className="text-lg" />
                      {uploadingHalalCert
                        ? "Uploading…"
                        : settings.halalCertificateUrl
                          ? "Replace certificate"
                          : "Upload certificate"}
                    </button>
                    {settings.halalCertificateUrl && (
                      <>
                        <a
                          href={settings.halalCertificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-label-mono text-primary underline"
                        >
                          <Icon name="description" className="text-base" />
                          View certificate
                        </a>
                        <button
                          type="button"
                          onClick={() => updateField("halalCertificateUrl", "")}
                          className="font-mono text-label-mono text-on-surface-variant underline"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                  <input
                    ref={halalCertInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadHalalCert(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </SettingsCard>

            <SettingsCard
              title="Business & tax"
              description="Legal details printed on receipts. Tax type follows your currency."
            >
              <div className="flex flex-col gap-5">
                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    Business address
                  </span>
                  <textarea
                    value={settings.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="123 Jalan Example, 50000 Kuala Lumpur"
                    rows={3}
                    className={inputClass}
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Company registration (SSM / UEN)
                    </span>
                    <input
                      value={settings.registrationNumber}
                      onChange={(e) => updateField("registrationNumber", e.target.value)}
                      placeholder="e.g. 202301234567"
                      className={inputClass}
                    />
                  </label>

                  <div className="block">
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Operating currency
                    </span>
                    <div className="mt-2">
                      <SegmentedControl
                        value={settings.currency}
                        onChange={(value) => updateField("currency", value)}
                        columns={2}
                        options={[
                          {
                            value: "MYR" as const,
                            label: "MYR",
                            hint: "Malaysia · SST",
                            icon: "payments",
                          },
                          {
                            value: "SGD" as const,
                            label: "SGD",
                            hint: "Singapore · GST",
                            icon: "payments",
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`block ${settings.currency !== "MYR" ? "opacity-60" : ""}`}>
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      SST number
                    </span>
                    <input
                      value={settings.sstNumber}
                      onChange={(e) => updateField("sstNumber", e.target.value)}
                      placeholder="e.g. W10-1234-56789012"
                      disabled={settings.currency !== "MYR"}
                      className={inputClass}
                    />
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {settings.currency === "MYR"
                        ? "Printed on receipts when SST is enabled."
                        : "Switch to MYR if you need SST on receipts."}
                    </p>
                  </label>

                  <label className={`block ${settings.currency !== "SGD" ? "opacity-60" : ""}`}>
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      GST number
                    </span>
                    <input
                      value={settings.gstNumber}
                      onChange={(e) => updateField("gstNumber", e.target.value)}
                      placeholder="e.g. M12345678X"
                      disabled={settings.currency !== "SGD"}
                      className={inputClass}
                    />
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {settings.currency === "SGD"
                        ? "Printed on receipts when GST is enabled."
                        : "Switch to SGD if you need GST on receipts."}
                    </p>
                  </label>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="Contact" description="Phone numbers for receipts and WhatsApp ordering.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    Landline
                  </span>
                  <input
                    value={settings.landlineNumber}
                    onChange={(e) => updateField("landlineNumber", e.target.value)}
                    placeholder={settings.currency === "SGD" ? "+65 6123 4567" : "+60 3 1234 5678"}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    WhatsApp number
                  </span>
                  <div className="mt-2 flex items-center gap-3 border border-surface-container-highest bg-surface-container-lowest px-3 py-2 focus-within:border-primary">
                    <SocialIcon name="whatsapp" className="h-5 w-5 shrink-0 text-primary" />
                    <input
                      value={settings.whatsappNumber}
                      onChange={(e) => updateField("whatsappNumber", e.target.value)}
                      placeholder={settings.currency === "SGD" ? "+65 9123 4567" : "+60 12 345 6789"}
                      className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                    />
                  </div>
                </label>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Location & languages"
              description="Help diners find you and choose menu languages."
            >
              <div className="flex flex-col gap-5">
                <div className={storeFieldGridClass}>
                  <div>
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Google Maps link
                    </span>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      Used in booking emails (optional).
                    </p>
                  </div>
                  <input
                    type="url"
                    value={settings.googleUrl}
                    onChange={(e) => updateField("googleUrl", e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                  />
                </div>

                <div className={storeFieldGridClass}>
                  <div>
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Coordinates
                    </span>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      Fallback if no Maps link.
                    </p>
                  </div>
                  <div>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        step="any"
                        value={settings.latitude}
                        onChange={(e) => updateField("latitude", e.target.value)}
                        placeholder="Latitude"
                        className="min-w-0 flex-1 border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                      />
                      <input
                        type="number"
                        step="any"
                        value={settings.longitude}
                        onChange={(e) => updateField("longitude", e.target.value)}
                        placeholder="Longitude"
                        className="min-w-0 flex-1 border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locating}
                      className="mt-2 inline-flex items-center gap-2 border border-surface-container-highest px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:border-primary/40 disabled:opacity-50"
                    >
                      <Icon name="my_location" className="text-base" />
                      {locating ? "Getting location…" : "Use current location"}
                    </button>
                  </div>
                </div>

                <div className={storeFieldGridClass}>
                  <div>
                    <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                      Menu languages
                    </span>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      Shown on diner menu, storefront, and iRewards.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const selected = settings.languages.includes(lang.code);
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleLanguage(lang.code)}
                          className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-body-md transition-colors ${
                            selected
                              ? "border-primary bg-surface-container-lowest text-primary"
                              : "border-surface-container-highest text-on-surface-variant hover:border-primary/40"
                          }`}
                        >
                          {selected && <Icon name="check" className="text-sm" />}
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="Other settings">
              <p className="text-body-md text-on-surface-variant">
                Points earn &amp; redeem rates are configured in{" "}
                <Link href={routes.rewards} className="text-primary underline">
                  iRewards program → Points
                </Link>
                .
              </p>

              <div className="mt-5 border-t border-surface-container-highest pt-5">
                <h4 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  Revenue targets
                </h4>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  Used in Reports → Compare to benchmark actual sales vs your goals.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      { key: "dailyRevenueTarget" as const, label: "Daily" },
                      { key: "weeklyRevenueTarget" as const, label: "Weekly" },
                      { key: "monthlyRevenueTarget" as const, label: "Monthly" },
                    ] as const
                  ).map((field) => (
                    <label key={field.key} className="block">
                      <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                        {field.label}
                      </span>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-label-mono text-on-surface-variant">
                          {settings.currency}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={settings[field.key]}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder={settings.currency === "SGD" ? "500.00" : "800.00"}
                          className="w-full border border-surface-container-highest bg-surface-container-lowest py-2 pl-14 pr-3"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </SettingsCard>
          </section>
        )}

        {tab === "checkout" && (
          <section>
            <h2 className="mb-1 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Checkout upsells
            </h2>
            <p className="mb-6 text-body-md text-on-surface-variant">
              Global add-ons shown to every diner on the &quot;Almost there&quot; screen before
              payment. Set rules and promo pricing (e.g. free ice cream when cart is over RM25).
              Per-product upsells are configured in Menu → edit product → Upselling.
            </p>
            <UpsellRuleEditor
              options={checkoutProducts}
              value={settings.globalUpsellLinks}
              onChange={(links) => updateField("globalUpsellLinks", links)}
              currency={settings.currency}
              max={8}
            />
          </section>
        )}

        {tab === "online" && (
          <section>
            <h2 className="mb-1 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Social
            </h2>
            <p className="mb-4 text-body-md text-on-surface-variant">
              Links shown to diners and used in review nudges.
            </p>
            <div className="flex flex-col gap-4">
              {SOCIAL_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                    {field.label}
                  </span>
                  <div className="mt-2 flex items-center gap-3 border border-surface-container-highest px-3 py-2">
                    <SocialIcon name={field.icon} className="h-5 w-5 shrink-0 text-primary" />
                    <input
                      type={field.inputType ?? "url"}
                      value={settings[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {tab === "receipt" && (
          <ReceiptEditor
            settings={{
              name: settings.name,
              logoUrl: settings.logoUrl,
              address: settings.address,
              registrationNumber: settings.registrationNumber,
              sstNumber: settings.sstNumber,
              gstNumber: settings.gstNumber,
              landlineNumber: settings.landlineNumber,
              currency: settings.currency,
              serviceChargeEnabled: settings.serviceChargeEnabled,
              serviceChargePercent: settings.serviceChargePercent,
              sstEnabled: settings.sstEnabled,
              sstRatePercent: settings.sstRatePercent,
              gstEnabled: settings.gstEnabled,
              gstRatePercent: settings.gstRatePercent,
              receiptFooterText: settings.receiptFooterText,
              receiptShowRegistration: settings.receiptShowRegistration,
            }}
            layout={receiptLayout}
            onSettingsChange={(receiptSettings) =>
              setSettings((prev) => ({ ...prev, ...receiptSettings }))
            }
            onLayoutChange={setReceiptLayout}
          />
        )}

        {tab === "flow" && (
          <DinerFlowPreview merchantSlug={merchantSlug} />
        )}

        {tab === "legal" && (
          <section>
            <h2 className="mb-2 font-display text-headline-sm text-primary">Legal Policies</h2>
            <p className="mb-8 text-body-md text-on-surface-variant">
              Each policy you fill in will appear as a public page on your storefront (e.g.{" "}
              <span className="font-mono text-label-mono">/legal/refund</span>). Default templates
              cover WhatsApp, email, campaign opt-out, and PDPA requests — edit as needed, then save.
            </p>
            <div className="flex flex-col gap-8">
              <div className="grid gap-3 md:grid-cols-[140px_1fr] md:items-start md:gap-6">
                <span className="pt-2 font-display text-eyebrow uppercase text-on-surface-variant">
                  Refund Policy
                </span>
                <div>
                  <AiAssistTextarea
                    merchantSlug={merchantSlug}
                    policyType="refund"
                    value={settings.refundPolicy}
                    onChange={(v) => updateField("refundPolicy", v)}
                    defaultText={policyDefaults().refundPolicy}
                    placeholder="Edit the default refund policy or click Generate with AI"
                    rows={8}
                  />
                  {settings.refundPolicy.trim() && (
                    <a
                      href={legalPolicyPath(merchantSlug, "refund")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block font-mono text-label-mono text-primary underline"
                    >
                      Preview {legalPolicyPath(merchantSlug, "refund")}
                    </a>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[140px_1fr] md:items-start md:gap-6">
                <span className="pt-2 font-display text-eyebrow uppercase text-on-surface-variant">
                  Privacy Policy
                </span>
                <div>
                  <AiAssistTextarea
                    merchantSlug={merchantSlug}
                    policyType="privacy"
                    value={settings.privacyPolicy}
                    onChange={(v) => updateField("privacyPolicy", v)}
                    defaultText={policyDefaults().privacyPolicy}
                    placeholder="Edit the default privacy policy or click Generate with AI"
                    rows={8}
                  />
                  {settings.privacyPolicy.trim() && (
                    <a
                      href={legalPolicyPath(merchantSlug, "privacy")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block font-mono text-label-mono text-primary underline"
                    >
                      Preview {legalPolicyPath(merchantSlug, "privacy")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "team" && <TeamSettingsPanel merchantSlug={merchantSlug} />}

      </div>
    </AdminShell>
  );
}
