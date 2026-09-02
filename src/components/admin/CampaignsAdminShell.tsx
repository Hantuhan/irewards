"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CampaignManagerView } from "@/components/admin/campaigns/CampaignManagerView";
import { PromoVoucherInventoryView } from "@/components/admin/campaigns/PromoVoucherInventoryView";
import type { Campaign } from "@/components/admin/campaigns/types";
import { Icon } from "@/components/ui/Icon";
import { CAMPAIGNS_MAIN_TABS, type CampaignsMainTab } from "@/lib/campaigns/main-tabs";
import { merchantApi } from "@/lib/merchant/fetch";
import type { NumberHealthSummary } from "@/lib/whatsapp/number-health";

type CampaignsAdminShellProps = {
  merchantSlug: string;
  /** Deep link, e.g. `?tab=promos`; old `?tab=bots` / `?tab=automations` links are normalised by the page. */
  initialTab?: CampaignsMainTab;
  /** `?campaign=<id>` opens that campaign's report inside the Campaigns tab. */
  openCampaignId?: string | null;
  /** `?compose=1` lands on the AI planner instead of the overview. */
  startCompose?: boolean;
};

export function CampaignsAdminShell({
  merchantSlug,
  initialTab = "campaigns",
  openCampaignId = null,
  startCompose = false,
}: CampaignsAdminShellProps) {
  const [mainTab, setMainTab] = useState<CampaignsMainTab>(initialTab);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [merchantName, setMerchantName] = useState("");
  const [currency, setCurrency] = useState<"MYR" | "SGD">("MYR");
  const [automationsEnabled, setAutomationsEnabled] = useState(true);
  const [sendWindowStart, setSendWindowStart] = useState("");
  const [sendWindowEnd, setSendWindowEnd] = useState("");
  const [sendCapHours, setSendCapHours] = useState(48);
  const [programLanguages, setProgramLanguages] = useState<string[]>(["en"]);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [focusCampaignId, setFocusCampaignId] = useState<string | null>(openCampaignId);
  const [numberHealth, setNumberHealth] = useState<NumberHealthSummary | null>(null);

  useEffect(() => {
    setMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setFocusCampaignId(openCampaignId);
  }, [openCampaignId]);

  const loadCampaigns = useCallback(async () => {
    const data = await merchantApi<{ campaigns: Campaign[]; numberHealth?: NumberHealthSummary }>(
      `/api/merchant/${merchantSlug}/campaigns`,
    );
    setCampaigns(data.campaigns);
    setNumberHealth(data.numberHealth ?? null);
  }, [merchantSlug]);

  const loadSettings = useCallback(async () => {
    const data = await merchantApi<{
      name: string;
      currency?: "MYR" | "SGD";
      retentionEnabled: boolean;
      campaignSendWindowStart?: string | null;
      campaignSendWindowEnd?: string | null;
      campaignSendCapHours?: number;
      languages?: string[];
    }>(`/api/merchant/${merchantSlug}/settings`);
    setMerchantName(data.name ?? "");
    setCurrency(data.currency === "SGD" ? "SGD" : "MYR");
    setAutomationsEnabled(data.retentionEnabled !== false);
    setSendWindowStart(data.campaignSendWindowStart?.slice(0, 5) || "");
    setSendWindowEnd(data.campaignSendWindowEnd?.slice(0, 5) || "");
    setSendCapHours(Number(data.campaignSendCapHours ?? 48));
    setProgramLanguages(data.languages?.length ? data.languages : ["en"]);
  }, [merchantSlug]);

  useEffect(() => {
    loadCampaigns();
    loadSettings();
  }, [loadCampaigns, loadSettings]);

  async function createVoucher(input: {
    name: string;
    code: string;
    type: "percentage" | "fixed";
    value: number;
    expiresAt: string | null;
  }) {
    await merchantApi(`/api/merchant/${merchantSlug}/promos`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function revokeVoucher(promoId: string) {
    await merchantApi(`/api/merchant/${merchantSlug}/promos`, {
      method: "PATCH",
      body: JSON.stringify({ promoId, active: false }),
    });
  }

  async function toggleAutomations(enabled: boolean) {
    setSavingSwitch(true);
    setSwitchError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ retentionEnabled: enabled }),
      });
      setAutomationsEnabled(enabled);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Could not update automations");
    } finally {
      setSavingSwitch(false);
    }
  }

  async function saveSendHygiene(patch: {
    campaignSendWindowStart?: string | null;
    campaignSendWindowEnd?: string | null;
    campaignSendCapHours?: number;
  }) {
    setSavingSwitch(true);
    setSwitchError(null);
    try {
      await merchantApi(`/api/merchant/${merchantSlug}/settings`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (patch.campaignSendWindowStart !== undefined) {
        setSendWindowStart(patch.campaignSendWindowStart?.slice(0, 5) || "");
      }
      if (patch.campaignSendWindowEnd !== undefined) {
        setSendWindowEnd(patch.campaignSendWindowEnd?.slice(0, 5) || "");
      }
      if (patch.campaignSendCapHours !== undefined) {
        setSendCapHours(patch.campaignSendCapHours);
      }
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Could not update send settings");
    } finally {
      setSavingSwitch(false);
    }
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="campaigns"
      title="Campaign overview"
      eyebrow="Marketing command center"
    >
      <div className="mb-6 flex gap-1 border-b border-surface-container-highest">
        {CAMPAIGNS_MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMainTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-display text-eyebrow uppercase transition-colors ${
              mainTab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon name={t.icon} className="text-base" />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "campaigns" ? (
        <>
          {switchError && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800"
            >
              <Icon name="error" className="text-lg" />
              {switchError}
            </div>
          )}
          <CampaignManagerView
            merchantSlug={merchantSlug}
            merchantName={merchantName}
            currency={currency}
            campaigns={campaigns}
            onCampaignsChange={loadCampaigns}
            automationsEnabled={automationsEnabled}
            savingSwitch={savingSwitch}
            onToggleAutomations={toggleAutomations}
            sendWindowStart={sendWindowStart}
            sendWindowEnd={sendWindowEnd}
            sendCapHours={sendCapHours}
            onSaveSendHygiene={saveSendHygiene}
            programLanguages={programLanguages}
            openCampaignId={focusCampaignId}
            numberHealth={numberHealth}
            startCompose={startCompose}
          />
        </>
      ) : (
        <PromoVoucherInventoryView
          merchantSlug={merchantSlug}
          onCreateVoucher={createVoucher}
          onRevokeVoucher={revokeVoucher}
        />
      )}
    </AdminShell>
  );
}
