"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";
import { SocialIcon } from "@/components/ui/SocialIcon";

type SettingsAdminShellProps = { merchantSlug: string };

type SettingsData = {
  name: string;
  whatsappNumber: string;
  currency: "MYR" | "SGD";
  pointsPerRinggit: number;
  facebookUrl: string;
  instagramUrl: string;
  googleUrl: string;
  xhsUrl: string;
  websiteUrl: string;
  storeEmail: string;
  googleReviewDelayMinutes: number;
  bounceBackDiscountPercent: number;
  bounceBackExpiryDays: number;
};

type SocialField = {
  key: keyof Pick<
    SettingsData,
    "facebookUrl" | "instagramUrl" | "googleUrl" | "xhsUrl" | "websiteUrl" | "storeEmail"
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
    key: "googleUrl",
    icon: "google",
    label: "Google",
    placeholder: "https://maps.google.com/...",
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

export function SettingsAdminShell({ merchantSlug }: SettingsAdminShellProps) {
  const [settings, setSettings] = useState<SettingsData>({
    name: "",
    whatsappNumber: "",
    currency: "MYR",
    pointsPerRinggit: 0.1,
    facebookUrl: "",
    instagramUrl: "",
    googleUrl: "",
    xhsUrl: "",
    websiteUrl: "",
    storeEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await merchantApi<{
      name: string;
      whatsappNumber: string | null;
      currency: "MYR" | "SGD";
      pointsPerRinggit: number;
      facebookUrl: string | null;
      instagramUrl: string | null;
      googleUrl: string | null;
      xhsUrl: string | null;
      websiteUrl: string | null;
      storeEmail: string | null;
    }>(`/api/merchant/${merchantSlug}/settings`);
    setSettings({
      name: data.name,
      currency: data.currency,
      pointsPerRinggit: data.pointsPerRinggit,
      whatsappNumber: data.whatsappNumber ?? "",
      facebookUrl: data.facebookUrl ?? "",
      instagramUrl: data.instagramUrl ?? "",
      googleUrl: data.googleUrl ?? "",
      xhsUrl: data.xhsUrl ?? "",
      websiteUrl: data.websiteUrl ?? "",
      storeEmail: data.storeEmail ?? "",
    });
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          name: settings.name,
          whatsappNumber: settings.whatsappNumber || null,
          currency: settings.currency,
          pointsPerRinggit: settings.pointsPerRinggit,
          facebookUrl: settings.facebookUrl || null,
          instagramUrl: settings.instagramUrl || null,
          googleUrl: settings.googleUrl || null,
          xhsUrl: settings.xhsUrl || null,
          websiteUrl: settings.websiteUrl || null,
          storeEmail: settings.storeEmail || null,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="settings"
      title="Store settings"
      eyebrow="Configuration"
      headerAction={
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      }
    >
      {saved && <p className="mb-4 text-emerald-700">Settings saved.</p>}
      {error && <p className="mb-4 text-red-700">{error}</p>}

      <div className="flex max-w-xl flex-col gap-10">
        <section>
          <h2 className="mb-4 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Store details
          </h2>
          <div className="flex flex-col gap-6">
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Store name
              </span>
              <input
                value={settings.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                WhatsApp number
              </span>
              <div className="mt-2 flex items-center gap-3 border border-surface-container-highest px-3 py-2">
                <SocialIcon name="whatsapp" className="h-5 w-5 shrink-0 text-primary" />
                <input
                  value={settings.whatsappNumber}
                  onChange={(e) => updateField("whatsappNumber", e.target.value)}
                  placeholder="+60 12 345 6789"
                  className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Currency
              </span>
              <select
                value={settings.currency}
                onChange={(e) => updateField("currency", e.target.value as "MYR" | "SGD")}
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              >
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
              </select>
            </label>

            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Points per RM 1 spent
              </span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={settings.pointsPerRinggit}
                onChange={(e) => updateField("pointsPerRinggit", Number(e.target.value))}
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-1 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Online presence
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

        <section>
          <h2 className="mb-4 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Retention & reviews
          </h2>
          <div className="flex flex-col gap-6">
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Google review delay (minutes)
              </span>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.googleReviewDelayMinutes ?? 30}
                onChange={(e) =>
                  updateField("googleReviewDelayMinutes", Number(e.target.value))
                }
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Bounce-back discount (%)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.bounceBackDiscountPercent ?? 20}
                onChange={(e) =>
                  updateField("bounceBackDiscountPercent", Number(e.target.value))
                }
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Bounce-back expiry (days)
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={settings.bounceBackExpiryDays ?? 14}
                onChange={(e) =>
                  updateField("bounceBackExpiryDays", Number(e.target.value))
                }
                className="mt-2 w-full border border-surface-container-highest px-3 py-2"
              />
            </label>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
