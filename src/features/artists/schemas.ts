import { z } from "zod";
import { TAGLINE_MAX_LENGTH } from "@/lib/constants";
import { HERO_LAYOUTS } from "@/types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full link starting with https://")
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Textareas are easier to edit than lists of inputs; split them into items on save. */
const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const paragraphs = (text: string) =>
  text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);

// Issues are raised on the field itself (not per item) so the form can show them under the textarea.
const listOf = (split: (text: string) => string[], maxItems: number, maxItemLength: number, label: string) =>
  z
    .string()
    .max(maxItems * maxItemLength)
    .transform(split)
    .superRefine((items, ctx) => {
      if (items.length > maxItems) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Up to ${maxItems} ${label}s` });
      }
      if (items.some((item) => item.length > maxItemLength)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Each ${label} must be under ${maxItemLength} characters`,
        });
      }
    });

export const artistProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  tagline: z
    .string()
    .trim()
    .max(TAGLINE_MAX_LENGTH, `Keep it to ${TAGLINE_MAX_LENGTH} characters or fewer`)
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  heroLayout: z.enum(HERO_LAYOUTS),
  bio: optionalText(2000),
  profileImage: z.string().trim().max(1000).nullable(),
  instagram: optionalUrl,
  youtube: optionalUrl,
  facebook: optionalUrl,
  pinterest: optionalUrl,
  website: optionalUrl,
  /** Paragraphs separated by a blank line. */
  journey: listOf(paragraphs, 10, 1500, "paragraph"),
  /** One item per line. */
  inspiration: listOf(lines, 12, 300, "line"),
  /** One skill per line. */
  skills: listOf(lines, 30, 60, "skill"),
  techniques: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Give the technique a name").max(60),
        description: z.string().trim().max(400),
      }),
    )
    .max(12, "Up to 12 techniques"),
});

export type ArtistProfileInput = z.output<typeof artistProfileSchema>;
export type ArtistProfileFormValues = z.input<typeof artistProfileSchema>;
