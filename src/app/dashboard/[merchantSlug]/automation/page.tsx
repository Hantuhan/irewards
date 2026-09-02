import { redirect } from "next/navigation";
import { dashboardRoutes } from "@/lib/navigation/routes";

type PageProps = {
  params: Promise<{ merchantSlug: string }>;
};

/** Automated journeys are campaigns now; keep old bookmarks working. */
export default async function AutomationAdminPage({ params }: PageProps) {
  const { merchantSlug } = await params;
  redirect(dashboardRoutes(merchantSlug).campaigns);
}
