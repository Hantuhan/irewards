"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { merchantApi } from "@/lib/merchant/fetch";
import { CAMPAIGN_CHANNELS, type CampaignChannel } from "@/lib/campaigns/channels";
import { Icon } from "@/components/ui/Icon";

type CampaignsAdminShellProps = { merchantSlug: string };

type Campaign = {
  id: string;
  name: string;
  channel: string;
  channelLabel: string;
  status: string;
  reach: number;
  conversion: string;
  messageBody: string | null;
  bannerTitle: string | null;
  bannerText: string | null;
  linkUrl: string | null;
};

type Promo = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  value: number;
  active: boolean;
};

const emptyForm = {
  name: "",
  channel: "banner" as CampaignChannel,
  messageBody: "",
  bannerTitle: "",
  bannerText: "",
  linkUrl: "",
};

export function CampaignsAdminShell({ merchantSlug }: CampaignsAdminShellProps) {
  const [tab, setTab] = useState<"campaigns" | "promos">("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [promoForm, setPromoForm] = useState({
    name: "",
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 10,
  });

  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    const data = await merchantApi<{ campaigns: Campaign[] }>(
      `/api/merchant/${merchantSlug}/campaigns`,
    );
    setCampaigns(data.campaigns);
  }, [merchantSlug]);

  const loadPromos = useCallback(async () => {
    const data = await merchantApi<{ promos: Promo[] }>(
      `/api/merchant/${merchantSlug}/promos`,
    );
    setPromos(data.promos);
  }, [merchantSlug]);

  useEffect(() => {
    loadCampaigns();
    loadPromos();
  }, [loadCampaigns, loadPromos]);

  async function createCampaign() {
    if (!form.name.trim()) return;
    await merchantApi(`/api/merchant/${merchantSlug}/campaigns`, {
      method: "POST",
      body: JSON.stringify({
        name: form.name.trim(),
        channel: form.channel,
        status: "draft",
        messageBody: form.messageBody || null,
        bannerTitle: form.bannerTitle || null,
        bannerText: form.bannerText || null,
        linkUrl: form.linkUrl || null,
      }),
    });
    setForm(emptyForm);
    await loadCampaigns();
  }

  async function sendCampaign(campaign: Campaign) {
    if (campaign.channel !== "whatsapp" && campaign.channel !== "sms") return;
    setSendingId(campaign.id);
    try {
      const result = await merchantApi<{ ok: boolean; queued: number; message: string }>(
        `/api/merchant/${merchantSlug}/campaigns/send`,
        {
          method: "POST",
          body: JSON.stringify({ campaignId: campaign.id }),
        },
      );
      alert(result.message);
      await loadCampaigns();
    } finally {
      setSendingId(null);
    }
  }

  async function toggleCampaign(campaign: Campaign) {
    const next = campaign.status === "active" ? "paused" : "active";
    await merchantApi(`/api/merchant/${merchantSlug}/campaigns`, {
      method: "PATCH",
      body: JSON.stringify({ campaignId: campaign.id, status: next }),
    });
    await loadCampaigns();
  }

  async function createPromo() {
    if (!promoForm.name.trim() || !promoForm.code.trim()) return;
    await merchantApi(`/api/merchant/${merchantSlug}/promos`, {
      method: "POST",
      body: JSON.stringify({
        name: promoForm.name,
        code: promoForm.code,
        type: promoForm.type,
        value: promoForm.value,
      }),
    });
    setPromoForm({ name: "", code: "", type: "percentage", value: 10 });
    await loadPromos();
  }

  async function togglePromo(promo: Promo) {
    await merchantApi(`/api/merchant/${merchantSlug}/promos`, {
      method: "PATCH",
      body: JSON.stringify({ promoId: promo.id, active: !promo.active }),
    });
    await loadPromos();
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="campaigns"
      title="Campaigns & promos"
      eyebrow="Marketing"
    >
      <div className="mb-6 flex gap-2 border-b border-surface-container-highest">
        {(["campaigns", "promos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-label-mono uppercase ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "campaigns" ? (
        <>
          <div className="mb-8 border border-surface-container-highest bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-display text-headline-sm text-primary">New campaign</h2>
            <div className="grid max-w-2xl gap-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Campaign name"
                className="border border-surface-container-highest px-3 py-2"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setForm({ ...form, channel: ch.id })}
                    className={`flex flex-col items-start gap-1 border p-3 text-left ${
                      form.channel === ch.id
                        ? "border-primary bg-surface-container-low"
                        : "border-surface-container-highest"
                    }`}
                  >
                    <Icon name={ch.icon} className="text-primary" />
                    <span className="font-display text-eyebrow uppercase">{ch.label}</span>
                    <span className="text-body-md text-on-surface-variant">{ch.description}</span>
                  </button>
                ))}
              </div>
              {form.channel === "banner" ? (
                <>
                  <input
                    value={form.bannerTitle}
                    onChange={(e) => setForm({ ...form, bannerTitle: e.target.value })}
                    placeholder="Banner headline"
                    className="border border-surface-container-highest px-3 py-2"
                  />
                  <textarea
                    value={form.bannerText}
                    onChange={(e) => setForm({ ...form, bannerText: e.target.value })}
                    placeholder="Banner message"
                    rows={3}
                    className="border border-surface-container-highest px-3 py-2"
                  />
                  <input
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="Optional link URL"
                    className="border border-surface-container-highest px-3 py-2"
                  />
                </>
              ) : (
                <textarea
                  value={form.messageBody}
                  onChange={(e) => setForm({ ...form, messageBody: e.target.value })}
                  placeholder={form.channel === "sms" ? "SMS message" : "WhatsApp message"}
                  rows={4}
                  className="border border-surface-container-highest px-3 py-2"
                />
              )}
              <button
                type="button"
                onClick={createCampaign}
                className="flex w-fit items-center gap-2 bg-primary px-4 py-2 text-on-primary"
              >
                <Icon name="add" />
                Create campaign
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-surface-container-highest bg-surface-container-lowest p-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-headline-sm text-primary">{campaign.name}</h2>
                    <span className="border border-surface-container-highest px-2 py-0.5 font-mono text-[10px] uppercase">
                      {campaign.channelLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    {campaign.reach} reached · {campaign.conversion} conversion
                  </p>
                  {campaign.bannerText && (
                    <p className="mt-2 text-body-md">{campaign.bannerText}</p>
                  )}
                  {campaign.messageBody && (
                    <p className="mt-2 font-mono text-label-mono text-on-surface-variant">
                      {campaign.messageBody}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(campaign.channel === "whatsapp" || campaign.channel === "sms") && (
                    <button
                      type="button"
                      onClick={() => sendCampaign(campaign)}
                      disabled={sendingId === campaign.id || !campaign.messageBody}
                      className="flex items-center gap-1 border border-primary px-3 py-1 font-display text-eyebrow uppercase text-primary disabled:opacity-50"
                    >
                      <Icon name="send" />
                      {sendingId === campaign.id ? "Sending…" : "Send"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCampaign(campaign)}
                    className={`border px-3 py-1 font-display text-eyebrow uppercase ${
                      campaign.status === "active"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {campaign.status}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap gap-2 border border-surface-container-highest bg-surface-container-lowest p-4">
            <input
              value={promoForm.name}
              onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
              placeholder="Promo name"
              className="border border-surface-container-highest px-3 py-2"
            />
            <input
              value={promoForm.code}
              onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
              placeholder="Code"
              className="border border-surface-container-highest px-3 py-2"
            />
            <input
              type="number"
              value={promoForm.value}
              onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
              className="w-24 border border-surface-container-highest px-3 py-2"
            />
            <button type="button" onClick={createPromo} className="bg-primary px-4 py-2 text-on-primary">
              Add promo
            </button>
          </div>
          <div className="grid gap-3">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between border border-surface-container-highest bg-surface-container-lowest p-4"
              >
                <div>
                  <p className="font-display text-headline-sm text-primary">
                    {promo.name}{" "}
                    <span className="font-mono text-label-mono text-on-surface-variant">
                      {promo.code}
                    </span>
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {promo.type === "percentage" ? `${promo.value}% off` : `RM ${promo.value} off`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePromo(promo)}
                  className={`border px-3 py-1 font-mono text-label-mono uppercase ${
                    promo.active ? "border-primary text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {promo.active ? "Active" : "Paused"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
