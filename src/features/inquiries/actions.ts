"use server";

import { actionError, type ActionResult } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getCurrentArtist, getPublicDataSource } from "@/services";
import { inquiryInputSchema, type InquiryFormValues } from "./schemas";

export async function submitInquiry(values: InquiryFormValues): Promise<ActionResult> {
  const parsed = inquiryInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { company, ...input } = parsed.data;
  // Honeypot tripped: report success without storing anything.
  if (company) return { ok: true, data: undefined };

  if (!rateLimit(`inquiry:${await getClientIp()}`, 5, 10 * 60 * 1000)) {
    return { ok: false, error: "Too many messages. Please try again in a few minutes." };
  }

  try {
    const artist = await getCurrentArtist();
    const ds = await getPublicDataSource();
    if (input.artworkId) {
      const artwork = await ds.artworks.getById(input.artworkId);
      if (!artwork || artwork.artistId !== artist.id) input.artworkId = null;
    }
    await ds.inquiries.create(artist.id, input);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "We couldn't send your message. Please try again later.");
  }
}
