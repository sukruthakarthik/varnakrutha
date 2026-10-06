import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getCurrentArtist, getPublicDataSource } from "@/services";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const artist = await getCurrentArtist();
  const artworks = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/gallery"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...artworks.map((a) => ({
      url: absoluteUrl(`/artworks/${a.slug}`),
      lastModified: a.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: a.coverImage ? [absoluteUrl(a.coverImage)] : undefined,
    })),
  ];
}
