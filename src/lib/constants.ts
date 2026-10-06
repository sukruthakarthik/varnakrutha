import type { Availability, Category } from "@/types";

export const CATEGORY_META: Record<
  Category,
  { label: string; storageFolder: string; description: string }
> = {
  heritage: {
    label: "Heritage",
    storageFolder: "heritage",
    description: "Monuments, ruins and living history of India.",
  },
  "temple-art": {
    label: "Temple Art",
    storageFolder: "temple-art",
    description: "Gopurams, sculptures and sacred architecture.",
  },
  landscape: {
    label: "Landscape",
    storageFolder: "landscapes",
    description: "Hills, rivers, skies and quiet horizons.",
  },
  watercolor: {
    label: "Watercolor",
    storageFolder: "watercolor",
    description: "Luminous washes and layered transparency.",
  },
  acrylic: {
    label: "Acrylic",
    storageFolder: "acrylic",
    description: "Bold colour and rich, textured surfaces.",
  },
  sketches: {
    label: "Sketches",
    storageFolder: "sketches",
    description: "Pencil, ink and on-location studies.",
  },
  other: {
    label: "Other",
    storageFolder: "other",
    description: "Experiments and creative expressions.",
  },
};

export const AVAILABILITY_META: Record<Availability, { label: string }> = {
  available: { label: "Available" },
  reserved: { label: "Reserved" },
  sold: { label: "Sold" },
};

export const CURRENCY = "INR";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Vercel rejects function request bodies over 4.5 MB, so uploads stay safely below that.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "4 MB";

export const STORAGE_BUCKET = "artworks";
