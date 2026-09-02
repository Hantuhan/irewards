"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cropBannerToBlob,
  DEFAULT_BANNER_CROP,
  loadImageFromFile,
  minCoverScale,
  type BannerCropState,
  viewportHeightForWidth,
} from "@/lib/campaigns/crop-banner-image";
import { STOREFRONT_BANNER_ASPECT } from "@/lib/campaigns/banner-spec";
import { Icon } from "@/components/ui/Icon";

type BannerImageEditorProps = {
  merchantSlug: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Ultra-compact upload + crop for workflow canvas nodes. */
  inline?: boolean;
  uploadLabel?: string;
};

export function BannerImageEditor({
  merchantSlug,
  value,
  onChange,
  disabled = false,
  compact = false,
  inline = false,
  uploadLabel = "Campaign banner",
}: BannerImageEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<BannerCropState>(DEFAULT_BANNER_CROP);
  const [viewportW, setViewportW] = useState(320);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const viewportH = viewportHeightForWidth(viewportW);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setViewportW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetCrop = useCallback(() => setCrop(DEFAULT_BANNER_CROP), []);

  const clearEditingImage = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function handleFile(file: File) {
    setError(null);
    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const { img, objectUrl } = await loadImageFromFile(file);
      objectUrlRef.current = objectUrl;
      setImage(img);
      setCrop(DEFAULT_BANNER_CROP);
      setEditing(true);
    } catch {
      setError("Could not load image. Use JPEG, PNG, or WebP under 5 MB.");
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!image || disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: crop.offsetX, oy: crop.offsetY };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setCrop((c) => ({
      ...c,
      offsetX: drag.ox + (e.clientX - drag.x),
      offsetY: drag.oy + (e.clientY - drag.y),
    }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function applyCrop() {
    if (!image) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await cropBannerToBlob(image, crop, viewportW, viewportH);
      const formData = new FormData();
      formData.append("file", blob, "banner.jpg");
      const response = await fetch(`/api/merchant/${merchantSlug}/campaigns/banner/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.url ?? null);
      setEditing(false);
      clearEditingImage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const displayScale = image
    ? minCoverScale(image.naturalWidth, image.naturalHeight, viewportW, viewportH) * crop.zoom
    : 1;

  const imageStyle = image
    ? {
        width: image.naturalWidth * displayScale,
        height: image.naturalHeight * displayScale,
        transform: `translate(calc(-50% + ${crop.offsetX}px), calc(-50% + ${crop.offsetY}px))`,
      }
    : undefined;

  const isMinimal = compact || inline;

  return (
    <div className={isMinimal ? "space-y-2" : "space-y-3"}>
      {!isMinimal && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-eyebrow uppercase text-on-surface-variant">
            Banner image
          </p>
          <p className="font-mono text-[10px] text-on-surface-variant">
            {STOREFRONT_BANNER_ASPECT.toFixed(1)}∶1 · drag & zoom to fit
          </p>
        </div>
      )}

      {value && !editing && inline && (
        <div className="border border-dashed border-on-surface/25 bg-surface-container-low p-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="mx-auto h-14 w-full object-cover" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
            Banner attached
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <label className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-primary hover:underline">
              Replace
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={disabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant hover:text-primary"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {value && !editing && !inline && (
        <div className="overflow-hidden border border-surface-container-highest">
          <div
            className="relative w-full bg-surface-container-low"
            style={{ aspectRatio: String(STOREFRONT_BANNER_ASPECT) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Menu promo preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2 border-t border-surface-container-highest p-2">
            <label className="flex cursor-pointer items-center gap-1 border border-surface-container-highest px-3 py-1.5 text-body-md hover:bg-surface-container-low">
              <Icon name="edit" className="text-base" />
              Replace
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={disabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="border border-surface-container-highest px-3 py-1.5 text-body-md text-on-surface-variant hover:text-primary"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {!value && !editing && inline && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-on-surface/25 bg-surface-container-low p-3 text-center transition-colors hover:border-primary/40 hover:bg-surface-container-lowest ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <Icon name="add_photo_alternate" className="text-2xl text-on-surface-variant" />
          <span className="text-[11px] text-on-surface-variant">
            Image upload — {uploadLabel}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant/80">
            Click to browse
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {!value && !editing && !inline && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-surface-container-highest bg-surface-container-lowest transition-colors hover:border-primary/40 hover:bg-surface-container-low ${compact ? "p-4" : "p-8"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
          style={{ aspectRatio: compact ? "3.2 / 1" : String(STOREFRONT_BANNER_ASPECT), maxHeight: compact ? 88 : undefined }}
        >
          <Icon name="add_photo_alternate" className={compact ? "text-2xl text-on-surface-variant" : "text-3xl text-on-surface-variant"} />
          <span className={compact ? "text-[11px] text-on-surface-variant" : "text-body-md text-on-surface-variant"}>
            {compact ? "Image upload" : "Upload banner image"}
          </span>
          {!compact && (
            <span className="text-center text-[11px] text-on-surface-variant/80">
              JPEG, PNG or WebP · max 5 MB
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {editing && image && inline && (
        <div className="space-y-2 border border-dashed border-on-surface/25 bg-surface-container-low p-2">
          <p className="text-center text-[10px] text-on-surface-variant">
            Drag to reposition · slider to zoom
          </p>
          <div
            ref={viewportRef}
            className="relative mx-auto w-full cursor-grab overflow-hidden bg-neutral-900 active:cursor-grabbing"
            style={{ aspectRatio: "3.2 / 1", maxHeight: 72, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={imageStyle}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="h-1 w-full accent-primary"
            aria-label="Zoom banner"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void applyCrop()}
              disabled={uploading}
              className="bg-[#1a3d2e] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-white disabled:opacity-50"
            >
              {uploading ? "Saving…" : "Apply"}
            </button>
            <button
              type="button"
              onClick={resetCrop}
              className="border border-surface-container-highest px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                clearEditingImage();
                resetCrop();
              }}
              className="border border-surface-container-highest px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing && image && !inline && (
        <div className="border border-surface-container-highest bg-surface-container-lowest p-4">
          <p className="mb-3 text-body-md text-on-surface-variant">
            Drag to reposition · use the slider to zoom
          </p>

          <div
            ref={viewportRef}
            className="relative mx-auto w-full max-w-lg cursor-grab overflow-hidden bg-neutral-900 active:cursor-grabbing"
            style={{ aspectRatio: String(STOREFRONT_BANNER_ASPECT), touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={imageStyle}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/30 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Icon name="zoom_out" className="text-lg text-on-surface-variant" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={crop.zoom}
              onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
              className="min-w-0 flex-1 accent-primary"
              aria-label="Zoom banner"
            />
            <Icon name="zoom_in" className="text-lg text-on-surface-variant" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void applyCrop()}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
            >
              <Icon name="check" />
              {uploading ? "Saving…" : "Apply banner"}
            </button>
            <button
              type="button"
              onClick={resetCrop}
              className="border border-surface-container-highest px-4 py-2 text-body-md"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                clearEditingImage();
                resetCrop();
              }}
              className="border border-surface-container-highest px-4 py-2 text-body-md text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-body-md text-red-700">{error}</p>}
    </div>
  );
}
