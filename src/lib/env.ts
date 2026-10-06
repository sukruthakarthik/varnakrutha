import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_ARTIST_SLUG: z.string().min(1).default("sukrutha"),
  NEXT_PUBLIC_DATA_SOURCE: z.enum(["mock", "supabase"]).default("mock"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().optional(),
  // International format, digits only (e.g. 919876543210).
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{8,15}$/, "Digits only, with country code").optional(),
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
