import { ConfigurableReceipt } from "@/components/receipt/ConfigurableReceipt";
import { OrderReceipt } from "@/components/receipt/OrderReceipt";
import { parseReceiptLayout } from "@/lib/receipt/layout";
import type { ReceiptMerchant, ReceiptOrder } from "@/lib/receipt/types";

type ReceiptViewProps = {
  merchant: ReceiptMerchant;
  order: ReceiptOrder;
  layout?: unknown;
  className?: string;
};

export function ReceiptView({ merchant, order, layout, className }: ReceiptViewProps) {
  const parsedLayout = parseReceiptLayout(layout);
  if (parsedLayout) {
    return (
      <ConfigurableReceipt
        merchant={merchant}
        order={order}
        layout={parsedLayout}
        className={className}
      />
    );
  }
  return <OrderReceipt merchant={merchant} order={order} className={className} />;
}
