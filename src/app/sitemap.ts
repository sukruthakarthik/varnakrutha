import type { MetadataRoute } from "next";
import { absoluteUrl, artistPath, artworkPath } from "@/lib/site";
import { getPublishedArtists, getPublishedArtworks } from "@/services";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, artworks] = await Promise.all([getPublishedArtists(), getPublishedArtworks()]);
  const slugById = new Map(artists.map((a) => [a.id, a.slug]));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/gallery"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/artists"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/join"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/copyright"), changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...artists.map((a) => ({
      url: absoluteUrl(artistPath(a.slug)),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...artworks.map((a) => ({
      url: absoluteUrl(artworkPath(a.slug, slugById.get(a.artistId) ?? "")),
      lastModified: a.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: a.coverImage ? [absoluteUrl(a.coverImage)] : undefined,
    })),
  ];
}
