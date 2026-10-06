import { z } from "zod";
import { AVAILABILITY, CATEGORIES } from "@/types";

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
  category: z.enum(CATEGORIES),
  width: optionalPositive,
  height: optionalPositive,
  price: optionalPositive,
  availability: z.enum(AVAILABILITY),
  featured: z.boolean(),
  coverImage: z.string().trim().max(1000).nullable(),
  images: z.array(z.string().trim().min(1).max(1000)).max(20),
});

export type ArtworkInput = z.output<typeof artworkInputSchema>;
export type ArtworkFormValues = z.input<typeof artworkInputSchema>;
