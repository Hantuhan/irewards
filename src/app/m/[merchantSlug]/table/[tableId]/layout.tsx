import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order · iRewards",
  description: "Scan, order, and pay at your table",
};

export default function TableStorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
