import Image from "next/image";
import { ReceiptQrCode } from "@/components/receipt/ReceiptQrCode";
import {
  formatReceiptDate,
  formatReceiptMoney,
  type ReceiptMerchant,
  type ReceiptOrder,
} from "@/lib/receipt/types";

type OrderReceiptProps = {
  merchant: ReceiptMerchant;
  order: ReceiptOrder;
  className?: string;
};

function ReceiptDivider() {
  return <div className="my-4 border-t border-dashed border-surface-container-highest" />;
}

function ReceiptRow({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 text-body-md ${
        muted ? "text-on-surface-variant" : "text-on-surface"
      }`}
    >
      <span>{label}</span>
      <span className={`shrink-0 font-mono text-label-mono ${emphasis ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function OrderReceipt({ merchant, order, className = "" }: OrderReceiptProps) {
  const isPaid = order.status === "paid";
  const showRegistration =
    merchant.receiptShowRegistration !== false && Boolean(merchant.registrationNumber?.trim());
  const showSst = Boolean(merchant.sstNumber?.trim());
  const showGst = Boolean(merchant.gstNumber?.trim());

  return (
    <article
      className={`mx-auto w-full max-w-md bg-surface-container-lowest px-6 py-8 shadow-sm ${className}`}
      aria-label="Order receipt"
    >
      {/* Header */}
      <header className="text-center">
        {merchant.logoUrl ? (
          <div className="relative mx-auto mb-4 h-16 w-40">
            <Image
              src={merchant.logoUrl}
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-dashed border-surface-container-highest bg-surface-container-low">
            <span className="font-display text-headline-sm text-primary">
              {merchant.name.charAt(0)}
            </span>
          </div>
        )}

        <h1 className="font-display text-headline-sm uppercase tracking-wide text-primary">
          {merchant.name}
        </h1>

        {merchant.address?.trim() && (
          <p className="mt-2 whitespace-pre-line text-body-md text-on-surface-variant">
            {merchant.address.trim()}
          </p>
        )}

        <div className="mt-2 space-y-0.5 text-body-md text-on-surface-variant">
          {merchant.landlineNumber?.trim() && <p>Tel: {merchant.landlineNumber.trim()}</p>}
          {showRegistration && (
            <p>Reg. no. {merchant.registrationNumber!.trim()}</p>
          )}
          {showSst && <p>SST no. {merchant.sstNumber!.trim()}</p>}
          {showGst && <p>GST no. {merchant.gstNumber!.trim()}</p>}
        </div>

        <ReceiptDivider />

        <div className="space-y-1 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
          <p>Receipt #{order.shortId}</p>
          {order.tableNumber && <p>Table {order.tableNumber}</p>}
          <p>{formatReceiptDate(order.paidAt)}</p>
        </div>

        {!isPaid && order.status === "pending" && (
          <p className="mt-3 inline-block border border-amber-300 bg-amber-50 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-900">
            Payment pending
          </p>
        )}
        {isPaid && (
          <p className="mt-3 inline-block border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
            Paid
          </p>
        )}
      </header>

      {/* Middle — line items & totals */}
      <section className="mt-6">
        <p className="mb-3 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
          Order details
        </p>

        <ul className="space-y-4">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="text-body-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-headline-sm text-on-surface">{item.name}</p>
                  {item.modifiers?.map((mod) => (
                    <p
                      key={`${mod.groupName}-${mod.optionName}`}
                      className="text-[13px] text-on-surface-variant"
                    >
                      + {mod.optionName}
                      {mod.priceDeltaCents !== 0 && (
                        <span className="font-mono text-label-mono">
                          {" "}
                          ({mod.priceDeltaCents > 0 ? "+" : ""}
                          {formatReceiptMoney(order.currency, mod.priceDeltaCents)})
                        </span>
                      )}
                    </p>
                  ))}
                  {item.note?.trim() ? (
                    <p className="mt-0.5 text-[13px] italic text-on-surface-variant">
                      Note: {item.note}
                    </p>
                  ) : null}
                  <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant">
                    {item.quantity} × {formatReceiptMoney(order.currency, item.unitPriceCents)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-label-mono">
                  {formatReceiptMoney(order.currency, item.unitPriceCents * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <ReceiptDivider />

        <div className="space-y-2">
          <ReceiptRow
            label="Subtotal"
            value={formatReceiptMoney(order.currency, order.subtotalCents)}
            muted
          />
          {order.serviceChargeCents > 0 && (
            <ReceiptRow
              label={order.serviceChargeLabel ?? "Service charge"}
              value={formatReceiptMoney(order.currency, order.serviceChargeCents)}
              muted
            />
          )}
          {order.taxCents > 0 && (
            <ReceiptRow
              label={order.taxLabel ?? "Tax"}
              value={formatReceiptMoney(order.currency, order.taxCents)}
              muted
            />
          )}
          {order.discountCents > 0 && (
            <ReceiptRow
              label="Discount"
              value={`-${formatReceiptMoney(order.currency, order.discountCents)}`}
              muted
            />
          )}
        </div>

        <ReceiptDivider />

        <div className="flex items-center justify-between">
          <span className="font-display text-headline-sm text-primary">Total</span>
          <span className="font-mono text-label-mono text-headline-sm text-primary">
            {formatReceiptMoney(order.currency, order.totalCents)}
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-6 text-center">
        <ReceiptDivider />
        <p className="text-body-md text-on-surface">
          {merchant.receiptFooterText?.trim() || "Thank you for dining with us!"}
        </p>
        <div className="mt-4">
          <ReceiptQrCode
            orderId={order.id}
            shortId={order.shortId.toUpperCase()}
            merchantSlug={merchant.slug}
            tableId={order.tableNumber}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
          Powered by iRewards
        </p>
      </footer>
    </article>
  );
}
