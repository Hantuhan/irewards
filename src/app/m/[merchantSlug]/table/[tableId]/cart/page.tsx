import { Suspense } from "react";
import { CartShell } from "@/components/storefront/CartShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
};

export default async function CartPage({ params }: PageProps) {
  const { merchantSlug, tableId } = await params;
  return (
    <Suspense fallback={<p className="p-12 text-center text-on-surface-variant">Loading cart…</p>}>
      <CartShell merchantSlug={merchantSlug} tableId={tableId} />
    </Suspense>
  );
}
