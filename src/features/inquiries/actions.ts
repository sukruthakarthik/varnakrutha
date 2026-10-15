"use server";

import { actionError, type ActionResult } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getCurrentArtist, getPublicDataSource, getPublishedArtists } from "@/services";
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

  const { company, artistId: requestedArtistId, ...input } = parsed.data;
  // Honeypot tripped: report success without storing anything.
  if (company) return { ok: true, data: undefined };

  if (!rateLimit(`inquiry:${await getClientIp()}`, 5, 10 * 60 * 1000)) {
    return { ok: false, error: "Too many messages. Please try again in a few minutes." };
  }

  try {
    const ds = await getPublicDataSource();
    // File the enquiry under the artwork's artist, else the requested artist, else the site's own artist.
    // Only approved artists count, so a crafted request can't target a hidden one.
    const published = new Set((await getPublishedArtists()).map((a) => a.id));
    let artistId = requestedArtistId && published.has(requestedArtistId) ? requestedArtistId : null;
    if (input.artworkId) {
      const artwork = await ds.artworks.getById(input.artworkId);
      if (artwork && published.has(artwork.artistId)) artistId = artwork.artistId;
      else input.artworkId = null;
    }
    await ds.inquiries.create(artistId ?? (await getCurrentArtist()).id, input);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "We couldn't send your message. Please try again later.");
  }
}
