import { MAX_IMAGE_BYTES } from "@/lib/constants";

export interface CompressionOptions {
  /** Longest edge of the output, in pixels. */
  maxDimension: number;
  /** Starting encoder quality, 0–1. Lowered automatically if the result is too large. */
  quality: number;
  /** Hard ceiling on the output size, in bytes. */
  maxBytes: number;
}

// Kept as a preset so plans can later offer different limits (e.g. larger images on a paid tier).
export const DEFAULT_COMPRESSION: CompressionOptions = {
  maxDimension: 2400,
  quality: 0.85,
  maxBytes: MAX_IMAGE_BYTES,
};

/** Portraits are shown at most ~40% of the page width, so they need less resolution. */
export const PROFILE_COMPRESSION: CompressionOptions = {
  maxDimension: 1600,
  quality: 0.85,
  maxBytes: MAX_IMAGE_BYTES,
};

/** Refuse anything larger than this before decoding, to avoid exhausting browser memory. */
export const MAX_SOURCE_BYTES = 60 * 1024 * 1024;

export interface CompressionResult {
  file: File;
  originalBytes: number;
  width: number;
  height: number;
}

export class ImageCompressionError extends Error {}

const MIN_QUALITY = 0.6;
const MAX_ATTEMPTS = 6;

/**
 * Resizes and re-encodes an image in the browser before upload.
 * Re-encoding also strips EXIF metadata such as camera GPS location.
 * Outputs WebP, or JPEG where the browser can't encode WebP.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION,
): Promise<CompressionResult> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageCompressionError("This file isn't an image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageCompressionError("This image is too large to process. Please use one under 60 MB.");
  }

  const source = await decode(file);
  try {
    let scale = Math.min(1, options.maxDimension / Math.max(source.width, source.height));
    let quality = options.quality;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      const blob = await encode(source.image, width, height, quality);

      if (blob.size <= options.maxBytes) {
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.${extension}`;
        return {
          file: new File([blob], name, { type: blob.type, lastModified: Date.now() }),
          originalBytes: file.size,
          width,
          height,
        };
      }
      // Too big: lower quality first, then shrink the dimensions.
      if (quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - 0.1);
      else scale *= 0.8;
    }
    throw new ImageCompressionError("Couldn't make this image small enough. Try a smaller photo.");
  } finally {
    source.release();
  }
}

interface DecodedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<DecodedImage> {
  // createImageBitmap is fastest and applies the EXIF rotation from phone cameras.
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // Fall back to <img>, which some browsers need for formats like HEIC (Safari).
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageCompressionError(
      "This browser can't read this image format. Save it as JPEG or PNG and try again.",
    );
  }
}

async function encode(image: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const webp = await draw(image, width, height, "image/webp", quality, false);
  // Browsers without WebP encoding silently return PNG, so fall back to JPEG.
  if (webp.type === "image/webp") return webp;
  return draw(image, width, height, "image/jpeg", quality, true);
}

function draw(
  image: CanvasImageSource,
  width: number,
  height: number,
  type: string,
  quality: number,
  flatten: boolean,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressionError("Image compression isn't supported in this browser.");
  if (flatten) {
    // JPEG has no transparency; paint white instead of black behind transparent areas.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageCompressionError("Couldn't compress this image."))),
      type,
      quality,
    );
  });
}
