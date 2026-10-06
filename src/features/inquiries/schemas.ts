import { z } from "zod";

export const inquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+()\-\s\d]*$/, "Please enter a valid phone number")
    .transform((v) => (v === "" ? null : v)),
  subject: z.string().trim().min(2, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000),
  artworkId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
  // Honeypot field — must stay empty; bots tend to fill every input.
  company: z.string().max(0).optional(),
});

export type InquiryInput = z.output<typeof inquiryInputSchema>;
export type InquiryFormValues = z.input<typeof inquiryInputSchema>;
