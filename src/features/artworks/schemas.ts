import { z } from "zod";
import { AVAILABILITY, CATEGORIES, MAX_CATEGORIES } from "@/types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalPositive = z
  .union([z.number(), z.nan(), z.null()])
  .transform((v) => (v === null || Number.isNaN(v) ? null : v))
  .pipe(z.number().positive().max(100_000_000).nullable());

export const artworkInputSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(140),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"),
  description: optionalText(600),
  story: optionalText(5000),
  year: z
    .union([z.number(), z.nan(), z.null()])
    .transform((v) => (v === null || Number.isNaN(v) ? null : v))
    .pipe(z.number().int().min(1900).max(2100).nullable()),
  medium: optionalText(120),
  categories: z
    .array(z.enum(CATEGORIES))
    .min(1, "Pick at least one category")
    .max(MAX_CATEGORIES, `Pick up to ${MAX_CATEGORIES} categories`)
    // Drop duplicates and keep a stable order so the same choice is always saved the same way.
    .transform((list) => CATEGORIES.filter((c) => list.includes(c))),
  width: optionalPositive,
  height: optionalPositive,
  price: optionalPositive,
  /** Charged on top of the price for online orders; goes to the artist in full. Blank = free shipping. */
  shippingFee: z
    .union([z.number(), z.nan(), z.null()])
    .transform((v) => (v === null || Number.isNaN(v) ? null : v))
    .pipe(z.number().min(0).max(1_000_000).nullable()),
  availability: z.enum(AVAILABILITY),
  featured: z.boolean(),
  coverImage: z.string().trim().max(1000).nullable(),
  images: z.array(z.string().trim().min(1).max(1000)).max(20),
});

export type ArtworkInput = z.output<typeof artworkInputSchema>;
export type ArtworkFormValues = z.input<typeof artworkInputSchema>;
