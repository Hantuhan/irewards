import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merchant dashboard · iRewards",
  description: "iRewards merchant SaaS — menus, loyalty, campaigns, and table QR",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
