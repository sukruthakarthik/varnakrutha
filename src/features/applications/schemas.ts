import { z } from "zod";
import { APPLICATION_STATUS } from "@/types";

const URL_PATTERN = /^https?:\/\/\S+$/i;

export const applicationInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+()\-\s\d]*$/, "Please enter a valid phone number")
    .transform((v) => (v === "" ? null : v)),
  city: z.string().trim().min(2, "Please enter your city").max(100),
  portfolioUrl: z
    .string()
    .trim()
    .max(500)
    .regex(URL_PATTERN, "Enter a full link starting with https://"),
  /** One link per line in the form. */
  sampleLinks: z
    .string()
    .max(3000)
    .transform((text) =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .superRefine((links, ctx) => {
      if (links.length > 5) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Up to 5 links, please" });
      if (links.some((l) => l.length > 500 || !URL_PATTERN.test(l))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each line must be a full link starting with https://" });
      }
    }),
  mediums: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === "" ? null : v)),
  statement: z
    .string()
    .trim()
    .min(30, "Please write at least a couple of sentences")
    .max(2000),
  // Honeypot field — must stay empty; bots tend to fill every input.
  company: z.string().max(0).optional(),
});

export type ApplicationInput = z.output<typeof applicationInputSchema>;
export type ApplicationFormValues = z.input<typeof applicationInputSchema>;

export const applicationStatusSchema = z.enum(APPLICATION_STATUS);
