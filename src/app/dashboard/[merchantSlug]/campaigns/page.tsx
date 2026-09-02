import { CampaignsAdminShell } from "@/components/admin/CampaignsAdminShell";
import { normalizeCampaignsTab } from "@/lib/campaigns/main-tabs";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    campaign?: string | string[];
    /** `?compose=1` opens the AI campaign planner straight away. */
    compose?: string | string[];
  }>;
};

export default async function CampaignsAdminPage({ params, searchParams }: PageProps) {
  const [{ merchantSlug }, { tab, campaign, compose }] = await Promise.all([params, searchParams]);
  const initialTab = normalizeCampaignsTab(Array.isArray(tab) ? tab[0] : tab);
  const openCampaignId = (Array.isArray(campaign) ? campaign[0] : campaign) ?? null;
  const startCompose = (Array.isArray(compose) ? compose[0] : compose) === "1";
  return (
    <CampaignsAdminShell
      merchantSlug={merchantSlug}
      initialTab={initialTab}
      openCampaignId={openCampaignId}
      startCompose={startCompose}
    />
  );
}
