import "server-only";
import { cache } from "react";
import { siteConfig } from "@/lib/site";
import { isSupabase } from "@/lib/env";
import { createMockDataSource } from "@/services/mock";
import type { DataSource } from "@/services/types";
import type { Artist, Artwork } from "@/types";

let mockSource: DataSource | undefined;

/** Data source for public, cacheable reads and anonymous inquiry submissions. */
export async function getPublicDataSource(): Promise<DataSource> {
  if (isSupabase) {
    const [{ createPublicSupabaseClient }, { createSupabaseDataSource }] = await Promise.all([
      import("@/lib/supabase/server"),
      import("@/services/supabase"),
    ]);
    return createSupabaseDataSource(createPublicSupabaseClient());
  }
  return (mockSource ??= createMockDataSource());
}

/** Data source bound to the current user's session (used by admin routes after auth checks). */
export async function getSessionDataSource(): Promise<DataSource> {
  if (isSupabase) {
    const [{ createServerSupabaseClient }, { createSupabaseDataSource }] = await Promise.all([
      import("@/lib/supabase/server"),
      import("@/services/supabase"),
    ]);
    return createSupabaseDataSource(await createServerSupabaseClient());
  }
  return (mockSource ??= createMockDataSource());
}

/** The artist whose portfolio is served at the site root. */
export const getCurrentArtist = cache(async (): Promise<Artist> => {
  const ds = await getPublicDataSource();
  const artist = await ds.artists.getBySlug(siteConfig.defaultArtistSlug);
  if (!artist) {
    throw new Error(`Artist "${siteConfig.defaultArtistSlug}" not found. Did you run the seed?`);
  }
  return artist;
});

// ─── Guests see approved artists only ───────────────────────────────

/** Artists whose profile an admin has approved, by name. */
export const getPublishedArtists = cache(async (): Promise<Artist[]> => {
  const artists = await (await getPublicDataSource()).artists.list();
  return artists.filter((a) => a.approvedAt);
});

export const getPublishedArtist = cache(async (slug: string): Promise<Artist | null> => {
  const artist = await (await getPublicDataSource()).artists.getBySlug(slug);
  return artist?.approvedAt ? artist : null;
});

/** Every approved artist's artworks, newest first. (Supabase RLS enforces the same rule.) */
export const getPublishedArtworks = cache(async (): Promise<Artwork[]> => {
  const [artists, artworks] = await Promise.all([
    getPublishedArtists(),
    getPublicDataSource().then((ds) => ds.artworks.list()),
  ]);
  const published = new Set(artists.map((a) => a.id));
  return artworks.filter((a) => published.has(a.artistId));
});
