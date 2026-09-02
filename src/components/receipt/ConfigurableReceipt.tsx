"use client";

import Image from "next/image";
import { ReceiptQrCode } from "@/components/receipt/ReceiptQrCode";
import {
  formatReceiptDate,
  formatReceiptMoney,
  type ReceiptMerchant,
  type ReceiptOrder,
} from "@/lib/receipt/types";
import {
  getBlockSetting,
  getBlockText,
  type ReceiptBlock,
  type ReceiptLayout,
  type ReceiptStyle,
} from "@/lib/receipt/layout";

type ConfigurableReceiptProps = {
  merchant: ReceiptMerchant;
  order: ReceiptOrder;
  layout: ReceiptLayout;
  className?: string;
  highlightBlockId?: string | null;
};

const BACKGROUND_CLASSES: Record<ReceiptStyle["backgroundStyle"], string> = {
  plain: "bg-surface-container-lowest",
  "paper-1":
    "bg-surface-container-lowest bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,transparent_8%,transparent_92%,rgba(0,0,0,0.02)_100%)]",
  "paper-2":
    "bg-[#faf8f5] bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.015)_3px,rgba(0,0,0,0.015)_4px)]",
  "paper-3":
    "bg-[#f5f3ef] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8)_0%,transparent_60%)]",
};

function ReceiptDivider() {
  return <div className="border-t border-dashed border-surface-container-highest" />;
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
      className={`flex items-start justify-between gap-4 ${muted ? "text-on-surface-variant" : "text-on-surface"}`}
    >
      <span>{label}</span>
      <span className={`shrink-0 font-mono text-label-mono ${emphasis ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function BarcodeBlock({ value }: { value: string }) {
  const bars = value
    .split("")
    .map((char, i) => {
      const w = (char.charCodeAt(0) % 3) + 1;
      const dark = i % 2 === 0;
      return { w, dark };
    })
    .slice(0, 48);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-10 items-end gap-px">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={bar.dark ? "bg-on-surface" : "bg-transparent"}
            style={{ width: bar.w, height: "100%" }}
          />
        ))}
      </div>
      <p className="font-mono text-[9px] tracking-widest text-on-surface-variant">{value}</p>
    </div>
  );
}

function BlockWrapper({
  block,
  highlightBlockId,
  gap,
  children,
}: {
  block: ReceiptBlock;
  highlightBlockId?: string | null;
  gap: number;
  children: React.ReactNode;
}) {
  const highlighted = highlightBlockId === block.id;
  return (
    <div
      data-block-id={block.id}
      style={{ marginBottom: gap }}
      className={highlighted ? "outline outline-2 outline-primary outline-offset-2" : undefined}
    >
      {children}
    </div>
  );
}

function renderBlock(
  block: ReceiptBlock,
  merchant: ReceiptMerchant,
  order: ReceiptOrder,
  highlightBlockId?: string | null,
  gap = 8,
): React.ReactNode {
  if (!block.enabled) return null;

  const wrap = (content: React.ReactNode) => (
    <BlockWrapper key={block.id} block={block} highlightBlockId={highlightBlockId} gap={gap}>
      {content}
    </BlockWrapper>
  );

  switch (block.type) {
    case "header": {
      const showReg =
        getBlockSetting(block, "showRegNo", true) &&
        merchant.receiptShowRegistration !== false &&
        Boolean(merchant.registrationNumber?.trim());
      const showSst =
        getBlockSetting(block, "showSstNo", true) && Boolean(merchant.sstNumber?.trim());
      const showGst =
        getBlockSetting(block, "showGstNo", true) && Boolean(merchant.gstNumber?.trim());
      return wrap(
        <header className="text-center">
          {getBlockSetting(block, "showLogo", true) &&
            (merchant.logoUrl ? (
              <div className="relative mx-auto mb-3 h-14 w-36">
                <Image
                  src={merchant.logoUrl}
                  alt=""
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center border border-dashed border-surface-container-highest bg-surface-container-low">
                <span className="font-display text-headline-sm text-primary">
                  {merchant.name.charAt(0)}
                </span>
              </div>
            ))}
          <h1 className="font-display text-headline-sm uppercase tracking-wide text-primary">
            {merchant.name}
          </h1>
          {getBlockSetting(block, "showAddress", true) && merchant.address?.trim() && (
            <p className="mt-1 whitespace-pre-line text-on-surface-variant">
              {merchant.address.trim()}
            </p>
          )}
          <div className="mt-1 space-y-0.5 text-on-surface-variant">
            {getBlockSetting(block, "showPhone", true) && merchant.landlineNumber?.trim() && (
              <p>Tel: {merchant.landlineNumber.trim()}</p>
            )}
            {showReg && <p>Reg. no. {merchant.registrationNumber!.trim()}</p>}
            {showSst && <p>SST no. {merchant.sstNumber!.trim()}</p>}
            {showGst && <p>GST no. {merchant.gstNumber!.trim()}</p>}
          </div>
        </header>,
      );
    }

    case "date_time":
      return wrap(
        <div className="space-y-0.5 text-center font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
          {getBlockSetting(block, "showReceiptNumber", true) && (
            <p>Receipt #{order.shortId}</p>
          )}
          {getBlockSetting(block, "showTable", true) && order.tableNumber && (
            <p>Table {order.tableNumber}</p>
          )}
          {getBlockSetting(block, "showDate", true) && <p>{formatReceiptDate(order.paidAt)}</p>}
          {order.status === "pending" && (
            <p className="mt-2 inline-block border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900">
              Payment pending
            </p>
          )}
          {order.status === "paid" && (
            <p className="mt-2 inline-block border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
              Paid
            </p>
          )}
        </div>,
      );

    case "meta_columns":
      return wrap(
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-on-surface-variant">
          <span>Order type: {order.serviceType === "takeaway" ? "Take away" : "Dine-in"}</span>
          <span className="text-right">Receipt #{order.shortId}</span>
        </div>,
      );

    case "items":
      return wrap(
        <section>
          <p className="mb-2 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Order details
          </p>
          <ul className="space-y-3">
            {order.items.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-headline-sm text-on-surface">{item.name}</p>
                    {getBlockSetting(block, "showModifiers", true) &&
                      item.modifiers?.map((mod) => (
                        <p
                          key={`${mod.groupName}-${mod.optionName}`}
                          className="text-[12px] text-on-surface-variant"
                        >
                          + {mod.optionName}
                        </p>
                      ))}
                    {getBlockSetting(block, "showQuantity", true) && (
                      <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
                        {item.quantity} × {formatReceiptMoney(order.currency, item.unitPriceCents)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-label-mono">
                    {formatReceiptMoney(order.currency, item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>,
      );

    case "totals":
      return wrap(
        <section>
          <div className="space-y-1.5">
            {getBlockSetting(block, "showSubtotal", true) && (
              <ReceiptRow
                label="Subtotal"
                value={formatReceiptMoney(order.currency, order.subtotalCents)}
                muted
              />
            )}
            {getBlockSetting(block, "showServiceCharge", false) && order.serviceChargeCents > 0 && (
              <ReceiptRow
                label={order.serviceChargeLabel ?? "Service charge"}
                value={formatReceiptMoney(order.currency, order.serviceChargeCents)}
                muted
              />
            )}
            {getBlockSetting(block, "showTax", false) && order.taxCents > 0 && (
              <ReceiptRow
                label={order.taxLabel ?? "Tax"}
                value={formatReceiptMoney(order.currency, order.taxCents)}
                muted
              />
            )}
            {getBlockSetting(block, "showDiscount", true) && order.discountCents > 0 && (
              <ReceiptRow
                label="Discount"
                value={`-${formatReceiptMoney(order.currency, order.discountCents)}`}
                muted
              />
            )}
          </div>
          {getBlockSetting(block, "showGrandTotal", true) && (
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-surface-container-highest pt-2">
              <span className="font-display text-headline-sm text-primary">Total</span>
              <span className="font-mono text-label-mono text-headline-sm text-primary">
                {formatReceiptMoney(order.currency, order.totalCents)}
              </span>
            </div>
          )}
        </section>,
      );

    case "service_charge":
      if (order.serviceChargeCents <= 0) return null;
      return wrap(
        <ReceiptRow
          label={
            getBlockSetting(block, "showRate", true)
              ? order.serviceChargeLabel ?? "Service charge"
              : "Service charge"
          }
          value={formatReceiptMoney(order.currency, order.serviceChargeCents)}
          muted
        />,
      );

    case "tax":
      if (order.taxCents <= 0) return null;
      return wrap(
        <ReceiptRow
          label={
            getBlockSetting(block, "showRate", true) ? order.taxLabel ?? "Tax" : "Tax"
          }
          value={formatReceiptMoney(order.currency, order.taxCents)}
          muted
        />,
      );

    case "payment":
      return wrap(
        <section className="space-y-1 font-mono text-[10px] text-on-surface-variant">
          {getBlockSetting(block, "showMethod", true) && (
            <div className="flex justify-between">
              <span>Payment</span>
              <span>DuitNow / Card</span>
            </div>
          )}
          {getBlockSetting(block, "showStatus", true) && (
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-primary">{order.status === "paid" ? "Approved" : "Pending"}</span>
            </div>
          )}
        </section>,
      );

    case "message":
      return wrap(
        <footer className="text-center">
          <p className="text-on-surface">
            {merchant.receiptFooterText?.trim() ||
              getBlockText(block, "text", "Thank you for dining with us!")}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
            Powered by iRewards
          </p>
        </footer>,
      );

    case "barcode": {
      const showQr = getBlockSetting(block, "showQr", true);
      const showBarcode = getBlockSetting(block, "showBarcode", false);
      const code = order.shortId.toUpperCase();
      return wrap(
        <div className="flex flex-col items-center gap-3 py-1">
          {showQr && (
            <ReceiptQrCode
              orderId={order.id}
              shortId={code}
              merchantSlug={merchant.slug}
              tableId={order.tableNumber}
            />
          )}
          {showBarcode && !showQr && <BarcodeBlock value={code} />}
        </div>,
      );
    }

    case "divider":
      return wrap(<ReceiptDivider />);

    case "custom_text":
      return wrap(
        <p className="text-center text-on-surface-variant">
          {getBlockText(block, "text", "Custom message")}
        </p>,
      );

    default:
      return null;
  }
}

export function ConfigurableReceipt({
  merchant,
  order,
  layout,
  className = "",
  highlightBlockId,
}: ConfigurableReceiptProps) {
  const { style, blocks } = layout;
  const widthPx = Math.round((style.receiptWidthMm / 80) * 320);

  return (
    <article
      className={`mx-auto px-5 py-6 shadow-sm ${style.showBackground ? BACKGROUND_CLASSES[style.backgroundStyle] : "bg-transparent"} ${className}`}
      style={{
        width: widthPx,
        maxWidth: "100%",
        fontSize: style.fontSizePx,
        lineHeight: style.lineHeight,
        color: style.textColor,
      }}
      aria-label="Order receipt"
    >
      {blocks.map((block) => renderBlock(block, merchant, order, highlightBlockId, style.blockGapPx))}
    </article>
  );
}
