import {
  STOREFRONT_BANNER_ASPECT,
  STOREFRONT_BANNER_OUTPUT_HEIGHT,
  STOREFRONT_BANNER_OUTPUT_WIDTH,
} from "@/lib/campaigns/banner-spec";

export type BannerCropState = {
  /** Scale multiplier on top of the minimum cover scale. */
  zoom: number;
  /** Pan offset from center, in viewport pixels. */
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_BANNER_CROP: BannerCropState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

export function minCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  return Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

export async function loadImageFromFile(
  file: File,
): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = objectUrl;
    });
    return { img, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function cropBannerToBlob(
  image: HTMLImageElement,
  crop: BannerCropState,
  viewportWidth: number,
  viewportHeight: number,
  mimeType: "image/jpeg" | "image/webp" = "image/jpeg",
): Promise<Blob> {
  const baseScale = minCoverScale(image.naturalWidth, image.naturalHeight, viewportWidth, viewportHeight);
  const scale = baseScale * crop.zoom;

  const displayW = image.naturalWidth * scale;
  const displayH = image.naturalHeight * scale;

  const imageLeft = viewportWidth / 2 + crop.offsetX - displayW / 2;
  const imageTop = viewportHeight / 2 + crop.offsetY - displayH / 2;

  const outW = STOREFRONT_BANNER_OUTPUT_WIDTH;
  const outH = STOREFRONT_BANNER_OUTPUT_HEIGHT;
  const scaleOut = outW / viewportWidth;

  const sx = Math.max(0, (0 - imageLeft) / scale);
  const sy = Math.max(0, (0 - imageTop) / scale);
  const sWidth = Math.min(image.naturalWidth - sx, viewportWidth / scale);
  const sHeight = Math.min(image.naturalHeight - sy, viewportHeight / scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    viewportWidth * scaleOut,
    viewportHeight * scaleOut,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to export banner"));
        else resolve(blob);
      },
      mimeType,
      0.92,
    );
  });
}

export function viewportHeightForWidth(width: number): number {
  return Math.round(width / STOREFRONT_BANNER_ASPECT);
}
