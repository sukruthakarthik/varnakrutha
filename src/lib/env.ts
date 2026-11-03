import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_ARTIST_SLUG: z.string().min(1).default("sukrutha"),
  NEXT_PUBLIC_DATA_SOURCE: z.enum(["mock", "supabase"]).default("mock"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().optional(),
  // International format with country code; "+", spaces, dashes and brackets are stripped (e.g. +91 98765 43210).
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .transform((v) => v.replace(/[\s()+-]/g, ""))
    .pipe(z.string().regex(/^\d{8,15}$/, "Use the number with its country code, e.g. +91 98765 43210"))
    .optional(),
  // Payments: "off" (enquiries only), "manual" (UPI to NEXT_PUBLIC_UPI_ID, confirmed by an admin) or "razorpay".
  NEXT_PUBLIC_PAYMENTS_MODE: z.enum(["off", "manual", "razorpay"]).default("off"),
  // Manual mode: the merchant UPI ID buyers pay, e.g. varnakrutha@okaxis, and the name shown in UPI apps.
  NEXT_PUBLIC_UPI_ID: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Use a UPI ID like name@bank").optional(),
  NEXT_PUBLIC_UPI_PAYEE_NAME: z.string().max(60).optional(),
  // Optional: a QR image placed in /public, e.g. /payments/upi-qr.png.
  NEXT_PUBLIC_UPI_QR_IMAGE: z.string().startsWith("/").optional(),
});

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them in client bundles.
export const env = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_DEFAULT_ARTIST_SLUG: process.env.NEXT_PUBLIC_DEFAULT_ARTIST_SLUG || undefined,
  NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
  NEXT_PUBLIC_PAYMENTS_MODE: process.env.NEXT_PUBLIC_PAYMENTS_MODE || undefined,
  NEXT_PUBLIC_UPI_ID: process.env.NEXT_PUBLIC_UPI_ID || undefined,
  NEXT_PUBLIC_UPI_PAYEE_NAME: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || undefined,
  NEXT_PUBLIC_UPI_QR_IMAGE: process.env.NEXT_PUBLIC_UPI_QR_IMAGE || undefined,
});

export const isSupabase = env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

export function requireSupabaseEnv() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required when NEXT_PUBLIC_DATA_SOURCE=supabase",
    );
  }
  return { url, anonKey };
}
