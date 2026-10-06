import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/constants";
import { RepositoryError } from "@/services/types";

type AllowedType = (typeof ALLOWED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<AllowedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function matchesSignature(bytes: Uint8Array, type: AllowedType): boolean {
  const at = (i: number) => bytes[i];
  switch (type) {
    case "image/jpeg":
      return at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff;
    case "image/png":
      return at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47;
    case "image/webp":
      return (
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      );
  }
}

/** Validates type, size and magic bytes; returns bytes plus a safe file extension. */
export async function validateImageFile(
  file: File,
): Promise<{ bytes: Uint8Array; extension: string; contentType: AllowedType }> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new RepositoryError("Only JPEG, PNG or WebP images are allowed", "invalid");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new RepositoryError(`Images must be smaller than ${MAX_IMAGE_LABEL}`, "invalid");
  }
  const contentType = file.type as AllowedType;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, contentType)) {
    throw new RepositoryError("The file content does not match its image type", "invalid");
  }
  return { bytes, extension: EXTENSIONS[contentType], contentType };
}

export function buildImageFileName(category: string, artworkSlug: string, extension: string) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${category}-${artworkSlug}-${suffix}.${extension}`;
}
