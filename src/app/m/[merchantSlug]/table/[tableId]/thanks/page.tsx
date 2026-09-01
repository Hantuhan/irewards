import { ThankYouShell } from "@/components/storefront/ThankYouShell";

type PageProps = {
  params: Promise<{ merchantSlug: string; tableId: string }>;
  searchParams: Promise<{ orderId?: string }>;
};

export default async function ThankYouPage({ params, searchParams }: PageProps) {
  const { merchantSlug, tableId } = await params;
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold">Missing order</h1>
        <p className="mt-2 text-neutral-600">No order ID was provided.</p>
      </main>
    );
  }

  return (
    <ThankYouShell
      merchantSlug={merchantSlug}
      tableId={tableId}
      orderId={orderId}
    />
  );
}
