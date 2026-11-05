import type { Artwork } from "@/types";

/**
 * Print-on-demand for digital artworks.
 *
 * Varnakrutha (not the artist) decides which print sizes an artwork can be sold in and what printing
 * costs. The buyer pays: the artist's price + the printing price + shipping, like a marketplace listing.
 * Commission is worked out on the artist's price only; the printing price pays the print shop.
 *
 * To change prices or sizes, edit the tables below and redeploy.
 */

export const PRINT_SIZES = ["A5", "A4", "A3", "A2"] as const;
export type PrintSize = (typeof PRINT_SIZES)[number];

export const PRINT_MATERIALS = ["paper", "canvas"] as const;
export type PrintMaterial = (typeof PRINT_MATERIALS)[number];

/** Sheet sizes in millimetres (short side × long side). */
export const PRINT_SIZE_MM: Record<PrintSize, { short: number; long: number }> = {
  A5: { short: 148, long: 210 },
  A4: { short: 210, long: 297 },
  A3: { short: 297, long: 420 },
  A2: { short: 420, long: 594 },
};

export const PRINT_MATERIAL_META: Record<PrintMaterial, { label: string; description: string }> = {
  paper: { label: "Art paper", description: "Matte, heavyweight fine-art paper." },
  canvas: { label: "Canvas", description: "Printed on canvas, ready to frame or stretch." },
};

/**
 * What Varnakrutha charges the buyer for printing, in rupees.
 * PLACEHOLDERS: replace with your print shop's quote plus your margin before selling prints.
 */
export const PRINT_PRICE_INR: Record<PrintMaterial, Record<PrintSize, number>> = {
  paper: { A5: 450, A4: 750, A3: 1200, A2: 2200 },
  canvas: { A5: 900, A4: 1500, A3: 2400, A2: 3800 },
};

/**
 * Below this many pixels per inch a print starts to look soft. 150 is a common floor for art prints
 * viewed at arm's length; 300 is ideal. Sizes the file can't fill at this sharpness aren't offered.
 */
export const MIN_PRINT_PPI = 150;

/** The digital tag is what turns an artwork into a print-on-demand listing. */
export function isDigital(artwork: Pick<Artwork, "categories">): boolean {
  return artwork.categories.includes("digital");
}

/**
 * How sharp the file would print on this sheet. The artwork is scaled to fit inside the sheet without
 * cropping, matching its long side to the sheet's long side, so a non-A-shaped picture gets a border.
 */
export function printPpi(pixelWidth: number, pixelHeight: number, size: PrintSize): number {
  const pxLong = Math.max(pixelWidth, pixelHeight);
  const pxShort = Math.min(pixelWidth, pixelHeight);
  const { short, long } = PRINT_SIZE_MM[size];
  // Whichever side runs out of room first decides how big the picture can be printed.
  const mmPerPx = Math.min(long / pxLong, short / pxShort);
  return 25.4 / mmPerPx;
}

/** The sizes this file is sharp enough for, smallest first. Empty if it's too small even for A5. */
export function printableSizes(pixelWidth: number | null, pixelHeight: number | null): PrintSize[] {
  if (!pixelWidth || !pixelHeight) return [];
  return PRINT_SIZES.filter((s) => printPpi(pixelWidth, pixelHeight, s) >= MIN_PRINT_PPI);
}

/** Pixels needed on the long side to offer a size, for help text ("A3 needs about 2,480 px"). */
export function minLongSidePx(size: PrintSize): number {
  return Math.ceil((PRINT_SIZE_MM[size].long / 25.4) * MIN_PRINT_PPI);
}

export interface PrintOption {
  size: PrintSize;
  material: PrintMaterial;
  /** Rupees. */
  printPrice: number;
  /** Rupees: the artist's price + printing. Shipping is added at checkout. */
  total: number;
}

/** Every size × material the buyer can choose for this artwork, cheapest first. */
export function printOptions(artwork: Pick<Artwork, "categories" | "price" | "pixelWidth" | "pixelHeight">): PrintOption[] {
  if (!isDigital(artwork) || !artwork.price) return [];
  const sizes = printableSizes(artwork.pixelWidth, artwork.pixelHeight);
  return PRINT_MATERIALS.flatMap((material) =>
    sizes.map((size) => {
      const printPrice = PRINT_PRICE_INR[material][size];
      return { size, material, printPrice, total: (artwork.price ?? 0) + printPrice };
    }),
  ).sort((a, b) => a.total - b.total);
}
