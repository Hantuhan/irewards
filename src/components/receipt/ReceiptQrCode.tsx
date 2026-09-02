"use client";

import Image from "next/image";
import { useMemo } from "react";
import { buildReceiptQrUrl } from "@/lib/receipt/qr";

type ReceiptQrCodeProps = {
  orderId: string;
  shortId: string;
  merchantSlug?: string | null;
  tableId?: string | null;
  size?: number;
};

export function ReceiptQrCode({
  orderId,
  shortId,
  merchantSlug,
  tableId,
  size = 88,
}: ReceiptQrCodeProps) {
  const url = useMemo(
    () => buildReceiptQrUrl({ orderId, merchantSlug, tableId }),
    [orderId, merchantSlug, tableId],
  );

  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <Image
        src={`/api/qr?data=${encodeURIComponent(url)}&size=${size}`}
        alt={`Receipt ${shortId} QR code`}
        width={size}
        height={size}
        unoptimized
        className="mx-auto border border-surface-container-highest bg-white p-1"
      />
      <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
        {shortId}
      </p>
      <p className="text-center text-[9px] text-on-surface-variant">Scan to view receipt</p>
    </div>
  );
}
