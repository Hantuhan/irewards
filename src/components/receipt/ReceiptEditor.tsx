"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfigurableReceipt } from "@/components/receipt/ConfigurableReceipt";
import { Icon } from "@/components/ui/Icon";
import {
  buildPreviewOrder,
  buildReceiptPreviewData,
  type ReceiptEditorSettings,
} from "@/lib/receipt/build-preview-data";
import { formatReceiptMoney } from "@/lib/receipt/types";
import {
  cloneReceiptLayout,
  createDefaultReceiptLayout,
  DEFAULT_RECEIPT_STYLE,
  getBlockSetting,
  RECEIPT_BLOCK_ICONS,
  RECEIPT_BLOCK_LABELS,
  RECEIPT_TEMPLATES,
  type ReceiptBlock,
  type ReceiptBlockType,
  type ReceiptLayout,
  type ReceiptStyle,
} from "@/lib/receipt/layout";
import { syncTaxFlagsForCurrency } from "@/lib/merchant/charge-settings";

type ReceiptEditorProps = {
  settings: ReceiptEditorSettings;
  layout: ReceiptLayout;
  onSettingsChange: (settings: ReceiptEditorSettings) => void;
  onLayoutChange: (layout: ReceiptLayout) => void;
};

const inputClass =
  "mt-1 w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2 text-body-md outline-none focus:border-primary";

const ADDABLE_BLOCKS: ReceiptBlockType[] = [
  "header",
  "date_time",
  "meta_columns",
  "items",
  "service_charge",
  "tax",
  "totals",
  "payment",
  "message",
  "barcode",
  "divider",
  "custom_text",
];

function blockDisplayLabel(block: ReceiptBlock): string {
  if (block.type !== "totals") return RECEIPT_BLOCK_LABELS[block.type];
  if (getBlockSetting(block, "showGrandTotal", true) && !getBlockSetting(block, "showSubtotal", true)) {
    return "Grand Total";
  }
  if (getBlockSetting(block, "showSubtotal", true) && !getBlockSetting(block, "showGrandTotal", true)) {
    return "Subtotal & Discount";
  }
  return RECEIPT_BLOCK_LABELS.totals;
}

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body-md">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function BlockSettings({
  block,
  onChange,
  settings,
}: {
  block: ReceiptBlock;
  onChange: (settings: ReceiptBlock["settings"]) => void;
  settings: ReceiptEditorSettings;
}) {
  const set = (key: string, value: boolean | string) =>
    onChange({ ...block.settings, [key]: value });

  switch (block.type) {
    case "header":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Show logo" checked={getBlockSetting(block, "showLogo", true)} onChange={(v) => set("showLogo", v)} />
          <ToggleSetting label="Show address" checked={getBlockSetting(block, "showAddress", true)} onChange={(v) => set("showAddress", v)} />
          <ToggleSetting label="Show phone" checked={getBlockSetting(block, "showPhone", true)} onChange={(v) => set("showPhone", v)} />
          <ToggleSetting label="Show registration no." checked={getBlockSetting(block, "showRegNo", true)} onChange={(v) => set("showRegNo", v)} />
          <ToggleSetting label="Show SST no." checked={getBlockSetting(block, "showSstNo", true)} onChange={(v) => set("showSstNo", v)} />
          <ToggleSetting label="Show GST no." checked={getBlockSetting(block, "showGstNo", true)} onChange={(v) => set("showGstNo", v)} />
        </div>
      );
    case "date_time":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Receipt number" checked={getBlockSetting(block, "showReceiptNumber", true)} onChange={(v) => set("showReceiptNumber", v)} />
          <ToggleSetting label="Table number" checked={getBlockSetting(block, "showTable", true)} onChange={(v) => set("showTable", v)} />
          <ToggleSetting label="Date & time" checked={getBlockSetting(block, "showDate", true)} onChange={(v) => set("showDate", v)} />
        </div>
      );
    case "items":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Show modifiers" checked={getBlockSetting(block, "showModifiers", true)} onChange={(v) => set("showModifiers", v)} />
          <ToggleSetting label="Show quantity" checked={getBlockSetting(block, "showQuantity", true)} onChange={(v) => set("showQuantity", v)} />
        </div>
      );
    case "totals":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Subtotal" checked={getBlockSetting(block, "showSubtotal", true)} onChange={(v) => set("showSubtotal", v)} />
          <ToggleSetting label="Service charge (inline)" checked={getBlockSetting(block, "showServiceCharge", false)} onChange={(v) => set("showServiceCharge", v)} />
          <ToggleSetting label="Tax (inline)" checked={getBlockSetting(block, "showTax", false)} onChange={(v) => set("showTax", v)} />
          <ToggleSetting label="Discount" checked={getBlockSetting(block, "showDiscount", true)} onChange={(v) => set("showDiscount", v)} />
          <ToggleSetting label="Grand total" checked={getBlockSetting(block, "showGrandTotal", true)} onChange={(v) => set("showGrandTotal", v)} />
        </div>
      );
    case "service_charge":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Show rate in label" checked={getBlockSetting(block, "showRate", true)} onChange={(v) => set("showRate", v)} />
          <p className="text-body-md text-on-surface-variant">
            Uses service charge settings below. Enable service charge to show this line on the receipt.
          </p>
        </div>
      );
    case "tax":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Show rate in label" checked={getBlockSetting(block, "showRate", true)} onChange={(v) => set("showRate", v)} />
          <p className="text-body-md text-on-surface-variant">
            Uses {settings.currency === "MYR" ? "SST" : "GST"} settings below. Enable tax to show this line on the receipt.
          </p>
        </div>
      );
    case "payment":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Payment method" checked={getBlockSetting(block, "showMethod", true)} onChange={(v) => set("showMethod", v)} />
          <ToggleSetting label="Status" checked={getBlockSetting(block, "showStatus", true)} onChange={(v) => set("showStatus", v)} />
        </div>
      );
    case "barcode":
      return (
        <div className="mt-3 flex flex-col gap-2 border-t border-surface-container-highest pt-3">
          <ToggleSetting label="Linear barcode" checked={getBlockSetting(block, "showBarcode", false)} onChange={(v) => set("showBarcode", v)} />
          <ToggleSetting label="QR code" checked={getBlockSetting(block, "showQr", true)} onChange={(v) => set("showQr", v)} />
        </div>
      );
    case "message":
      return (
        <div className="mt-3 border-t border-surface-container-highest pt-3">
          <label className="block text-body-md text-on-surface-variant">
            Footer message (overrides store setting for this block)
            <textarea
              value={typeof block.settings.text === "string" ? block.settings.text : settings.receiptFooterText}
              onChange={(e) => set("text", e.target.value)}
              placeholder={settings.receiptFooterText || "Thank you for dining with us!"}
              rows={2}
              className={inputClass}
            />
          </label>
        </div>
      );
    case "custom_text":
      return (
        <div className="mt-3 border-t border-surface-container-highest pt-3">
          <label className="block text-body-md text-on-surface-variant">
            Custom text
            <textarea
              value={typeof block.settings.text === "string" ? block.settings.text : ""}
              onChange={(e) => set("text", e.target.value)}
              placeholder="Enter custom message"
              rows={2}
              className={inputClass}
            />
          </label>
        </div>
      );
    default:
      return null;
  }
}

export function ReceiptEditor({
  settings,
  layout,
  onSettingsChange,
  onLayoutChange,
}: ReceiptEditorProps) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
  const didDefaultCharges = useRef(false);
  const isMyr = settings.currency === "MYR";

  // Turn on service charge + tax for preview when merchant has neither configured yet.
  useEffect(() => {
    if (didDefaultCharges.current) return;
    didDefaultCharges.current = true;
    const taxOff = isMyr ? !settings.sstEnabled : !settings.gstEnabled;
    if (!settings.serviceChargeEnabled || taxOff) {
      onSettingsChange({
        ...settings,
        serviceChargeEnabled: true,
        ...syncTaxFlagsForCurrency(settings.currency),
      });
    }
  }, [isMyr, onSettingsChange, settings]);

  const preview = useMemo(
    () => buildReceiptPreviewData(settings, layout),
    [settings, layout],
  );

  const previewOrder = useMemo(() => buildPreviewOrder(settings), [settings]);

  const taxEnabled = isMyr ? settings.sstEnabled : settings.gstEnabled;
  const taxRate = isMyr ? settings.sstRatePercent : settings.gstRatePercent;

  const updateStyle = useCallback(
    (patch: Partial<ReceiptStyle>) => {
      onLayoutChange({ ...layout, style: { ...layout.style, ...patch } });
    },
    [layout, onLayoutChange],
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<ReceiptBlock>) => {
      onLayoutChange({
        ...layout,
        blocks: layout.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      });
    },
    [layout, onLayoutChange],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      onLayoutChange({ ...layout, blocks: layout.blocks.filter((b) => b.id !== blockId) });
      if (expandedBlockId === blockId) setExpandedBlockId(null);
    },
    [layout, onLayoutChange, expandedBlockId],
  );

  const duplicateBlock = useCallback(
    (block: ReceiptBlock) => {
      const copy: ReceiptBlock = {
        ...block,
        id: crypto.randomUUID(),
        settings: { ...block.settings },
      };
      const index = layout.blocks.findIndex((b) => b.id === block.id);
      const blocks = [...layout.blocks];
      blocks.splice(index + 1, 0, copy);
      onLayoutChange({ ...layout, blocks });
    },
    [layout, onLayoutChange],
  );

  const addBlock = useCallback(
    (type: ReceiptBlockType) => {
      const defaults: Record<ReceiptBlockType, ReceiptBlock["settings"]> = {
        header: {
          showLogo: true,
          showAddress: true,
          showPhone: true,
          showRegNo: true,
          showSstNo: true,
          showGstNo: true,
        },
        date_time: { showReceiptNumber: true, showTable: true, showDate: true },
        meta_columns: {},
        items: { showModifiers: true, showQuantity: true },
        service_charge: { showRate: true },
        tax: { showRate: true },
        totals: {
          showSubtotal: true,
          showServiceCharge: false,
          showTax: false,
          showDiscount: true,
          showGrandTotal: true,
        },
        payment: { showMethod: true, showStatus: true },
        message: {},
        barcode: { showBarcode: false, showQr: true },
        divider: {},
        custom_text: { text: "Custom message" },
      };
      const newBlock: ReceiptBlock = {
        id: crypto.randomUUID(),
        type,
        enabled: true,
        settings: defaults[type],
      };
      onLayoutChange({ ...layout, blocks: [...layout.blocks, newBlock] });
      setExpandedBlockId(newBlock.id);
    },
    [layout, onLayoutChange],
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = RECEIPT_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      onLayoutChange(cloneReceiptLayout(template.layout));
    },
    [onLayoutChange],
  );

  const reorderBlocks = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const blocks = [...layout.blocks];
      const fromIndex = blocks.findIndex((b) => b.id === fromId);
      const toIndex = blocks.findIndex((b) => b.id === toId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      onLayoutChange({ ...layout, blocks });
    },
    [layout, onLayoutChange],
  );

  const resetLayout = useCallback(() => {
    onLayoutChange(createDefaultReceiptLayout());
  }, [onLayoutChange]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* Left: controls */}
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Receipt Editor</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Customize your diner receipt with drag-and-drop blocks and live preview.
          </p>
        </div>

        {/* Template */}
        <section className="border border-surface-container-highest bg-surface-container-lowest p-4">
          <label className="block">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Template
            </span>
            <select
              value={layout.templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className={inputClass}
            >
              {RECEIPT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {RECEIPT_TEMPLATES.find((t) => t.id === layout.templateId)?.description}
          </p>
        </section>

        {/* Typography & layout */}
        <section className="border border-surface-container-highest bg-surface-container-lowest p-4">
          <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Typography &amp; layout
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Receipt width (mm)</span>
              <input
                type="number"
                min={58}
                max={80}
                value={layout.style.receiptWidthMm}
                onChange={(e) => updateStyle({ receiptWidthMm: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Font size (px)</span>
              <input
                type="range"
                min={9}
                max={14}
                value={layout.style.fontSizePx}
                onChange={(e) => updateStyle({ fontSizePx: Number(e.target.value) })}
                className="mt-2 w-full"
              />
              <span className="font-mono text-label-mono text-on-surface-variant">
                {layout.style.fontSizePx}px
              </span>
            </label>
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Line height</span>
              <input
                type="range"
                min={1}
                max={2}
                step={0.1}
                value={layout.style.lineHeight}
                onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
                className="mt-2 w-full"
              />
              <span className="font-mono text-label-mono text-on-surface-variant">
                {layout.style.lineHeight}
              </span>
            </label>
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Block gap (px)</span>
              <input
                type="range"
                min={0}
                max={24}
                value={layout.style.blockGapPx}
                onChange={(e) => updateStyle({ blockGapPx: Number(e.target.value) })}
                className="mt-2 w-full"
              />
              <span className="font-mono text-label-mono text-on-surface-variant">
                {layout.style.blockGapPx}px
              </span>
            </label>
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Text color</span>
              <input
                type="color"
                value={layout.style.textColor}
                onChange={(e) => updateStyle({ textColor: e.target.value })}
                className="mt-2 h-10 w-full cursor-pointer border border-surface-container-highest"
              />
            </label>
            <label className="block">
              <span className="text-body-md text-on-surface-variant">Background</span>
              <select
                value={layout.style.backgroundStyle}
                onChange={(e) =>
                  updateStyle({ backgroundStyle: e.target.value as ReceiptStyle["backgroundStyle"] })
                }
                className={inputClass}
              >
                <option value="plain">Plain</option>
                <option value="paper-1">Paper style 1</option>
                <option value="paper-2">Paper style 2</option>
                <option value="paper-3">Paper style 3</option>
              </select>
            </label>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={layout.style.showBackground}
              onChange={(e) => updateStyle({ showBackground: e.target.checked })}
            />
            <span className="text-body-md">Show receipt background</span>
          </label>
        </section>

        {/* Service charge & tax */}
        <section className="border border-surface-container-highest bg-surface-container-lowest p-4">
          <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Service charge &amp; tax
          </h3>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Applied at checkout on subtotal. Tax is calculated on subtotal plus service charge.
            Add Service Charge and Tax blocks in the content blocks list to control
            where they appear on the receipt.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div className="border border-surface-container-highest bg-surface-container-low p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={settings.serviceChargeEnabled}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, serviceChargeEnabled: e.target.checked })
                  }
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-display text-eyebrow uppercase text-on-surface">
                    Service charge
                  </span>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    Common 10% dine-in charge on order subtotal.
                  </p>
                  {settings.serviceChargeEnabled && (
                    <label className="mt-3 block">
                      <span className="font-mono text-label-mono text-on-surface-variant">
                        Rate (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={settings.serviceChargePercent}
                        onChange={(e) =>
                          onSettingsChange({
                            ...settings,
                            serviceChargePercent: Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                  )}
                </div>
              </label>
            </div>

            <div className="border border-surface-container-highest bg-surface-container-low p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) =>
                    onSettingsChange(
                      isMyr
                        ? { ...settings, sstEnabled: e.target.checked }
                        : { ...settings, gstEnabled: e.target.checked },
                    )
                  }
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-display text-eyebrow uppercase text-on-surface">
                    {isMyr ? "Service tax (SST)" : "Goods & services tax (GST)"}
                  </span>
                  <p className="mt-1 text-body-md text-on-surface-variant">
                    {isMyr
                      ? "Malaysia SST on subtotal + service charge."
                      : "Singapore GST on subtotal + service charge."}
                  </p>
                  {taxEnabled && (
                    <label className="mt-3 block">
                      <span className="font-mono text-label-mono text-on-surface-variant">
                        {isMyr ? "SST" : "GST"} rate (%)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={taxRate}
                        onChange={(e) =>
                          onSettingsChange(
                            isMyr
                              ? { ...settings, sstRatePercent: Number(e.target.value) }
                              : { ...settings, gstRatePercent: Number(e.target.value) },
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  )}
                </div>
              </label>
            </div>

            <div className="border border-dashed border-surface-container-highest bg-surface-container-lowest p-4">
              <p className="font-display text-eyebrow uppercase text-on-surface-variant">
                Live breakdown (sample order)
              </p>
              <dl className="mt-3 space-y-2 text-body-md">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Subtotal</dt>
                  <dd className="font-mono text-label-mono">
                    {formatReceiptMoney(previewOrder.currency, previewOrder.subtotalCents)}
                  </dd>
                </div>
                {settings.serviceChargeEnabled && previewOrder.serviceChargeCents > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">
                      {previewOrder.serviceChargeLabel ?? "Service charge"}
                    </dt>
                    <dd className="font-mono text-label-mono">
                      {formatReceiptMoney(previewOrder.currency, previewOrder.serviceChargeCents)}
                    </dd>
                  </div>
                )}
                {taxEnabled && previewOrder.taxCents > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">{previewOrder.taxLabel ?? "Tax"}</dt>
                    <dd className="font-mono text-label-mono">
                      {formatReceiptMoney(previewOrder.currency, previewOrder.taxCents)}
                    </dd>
                  </div>
                )}
                {previewOrder.discountCents > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Discount</dt>
                    <dd className="font-mono text-label-mono">
                      -{formatReceiptMoney(previewOrder.currency, previewOrder.discountCents)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-surface-container-highest pt-2">
                  <dt className="font-display text-headline-sm text-primary">Total</dt>
                  <dd className="font-mono text-label-mono text-headline-sm text-primary">
                    {formatReceiptMoney(previewOrder.currency, previewOrder.totalCents)}
                  </dd>
                </div>
              </dl>
            </div>

            <label className="block">
              <span className="font-display text-eyebrow uppercase text-on-surface-variant">
                Footer message
              </span>
              <textarea
                value={settings.receiptFooterText}
                onChange={(e) =>
                  onSettingsChange({ ...settings, receiptFooterText: e.target.value })
                }
                placeholder="Thank you for dining with us!"
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        {/* Block list */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              Content blocks
            </h3>
            <button
              type="button"
              onClick={resetLayout}
              className="font-mono text-label-mono text-red-700 underline"
            >
              Reset layout
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {layout.blocks.map((block) => {
              const expanded = expandedBlockId === block.id;
              const isDragging = dragBlockId === block.id;
              const isHover = hoverBlockId === block.id && dragBlockId && dragBlockId !== block.id;

              return (
                <li
                  key={block.id}
                  draggable
                  onDragStart={() => setDragBlockId(block.id)}
                  onDragEnd={() => {
                    setDragBlockId(null);
                    setHoverBlockId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverBlockId(block.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragBlockId) reorderBlocks(dragBlockId, block.id);
                    setDragBlockId(null);
                    setHoverBlockId(null);
                  }}
                  className={`border bg-surface-container-lowest transition-colors ${
                    isHover
                      ? "border-primary"
                      : "border-surface-container-highest"
                  } ${isDragging ? "opacity-50" : ""} ${!block.enabled ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2 p-3">
                    <button
                      type="button"
                      className="cursor-grab text-on-surface-variant active:cursor-grabbing"
                      aria-label="Drag to reorder"
                    >
                      <Icon name="drag_indicator" />
                    </button>
                    <Icon
                      name={RECEIPT_BLOCK_ICONS[block.type]}
                      className="text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedBlockId(expanded ? null : block.id)}
                      className="min-w-0 flex-1 text-left font-display text-eyebrow uppercase"
                    >
                      {blockDisplayLabel(block)}
                    </button>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        onChange={(e) => updateBlock(block.id, { enabled: e.target.checked })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => duplicateBlock(block)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Duplicate block"
                    >
                      <Icon name="content_copy" className="text-lg" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="text-on-surface-variant hover:text-red-700"
                      aria-label="Remove block"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedBlockId(expanded ? null : block.id)}
                      className="text-on-surface-variant"
                    >
                      <Icon name={expanded ? "expand_less" : "expand_more"} />
                    </button>
                  </div>
                  {expanded && (
                    <div className="border-t border-surface-container-highest px-4 pb-4">
                      <BlockSettings
                        block={block}
                        settings={settings}
                        onChange={(s) => updateBlock(block.id, { settings: s })}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            <p className="mb-2 font-display text-eyebrow uppercase text-on-surface-variant">
              Add block
            </p>
            <div className="flex flex-wrap gap-2">
              {ADDABLE_BLOCKS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex items-center gap-1.5 border border-surface-container-highest px-3 py-2 text-body-md hover:border-primary hover:text-primary"
                >
                  <Icon name={RECEIPT_BLOCK_ICONS[type]} className="text-base" />
                  {RECEIPT_BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <p className="text-body-md text-on-surface-variant">
          Logo, store name, and address come from the Store tab. Changes preview here instantly;
          click Save settings to publish.
        </p>
      </div>

      {/* Right: live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="border border-surface-container-highest bg-surface-container-low p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-eyebrow uppercase text-on-surface-variant">
              Live preview
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sample order
            </span>
          </div>
          <div className="flex justify-center overflow-x-auto bg-surface-container py-6">
            <ConfigurableReceipt
              merchant={preview.merchant}
              order={preview.order}
              layout={preview.layout}
              highlightBlockId={expandedBlockId}
            />
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase text-on-surface-variant">
            {layout.style.receiptWidthMm}mm · {layout.style.fontSizePx}px · Preview only
          </p>
        </div>
      </div>
    </div>
  );
}

export { createDefaultReceiptLayout, DEFAULT_RECEIPT_STYLE };
