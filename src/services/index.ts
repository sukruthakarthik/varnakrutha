import "server-only";
import { cache } from "react";
import { siteConfig } from "@/lib/site";
import { isSupabase } from "@/lib/env";
import { createMockDataSource } from "@/services/mock";
import type { DataSource } from "@/services/types";
import type { Artist } from "@/types";

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
