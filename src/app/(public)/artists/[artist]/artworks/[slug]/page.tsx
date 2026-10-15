import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArtworkDetail, artworkMetadata } from "@/features/artworks/artwork-page";
import { artworkPath, siteConfig } from "@/lib/site";
import { getPublicDataSource, getPublishedArtist } from "@/services";

export const revalidate = 3600;

type Props = { params: Promise<{ artist: string; slug: string }> };

async function getArtwork({ artist: artistSlug, slug }: { artist: string; slug: string }) {
  const artist = await getPublishedArtist(artistSlug);
  if (!artist) return { artist: null, artwork: null };
  const artwork = await (await getPublicDataSource()).artworks.getBySlug(slug, artist.id);
  return { artist, artwork };
}

// Rendered on first visit, then cached; new artists' works appear without a rebuild.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, artwork } = await getArtwork(await params);
  if (!artist) return { title: "Artwork not found", robots: { index: false } };
  return artworkMetadata(artist, artwork);
}

export default async function ArtistArtworkPage({ params }: Props) {
  const resolved = await params;
  // The site's own artist keeps the short URLs.
  if (resolved.artist === siteConfig.defaultArtistSlug) permanentRedirect(artworkPath(resolved.slug, resolved.artist));
  const { artist, artwork } = await getArtwork(resolved);
  if (!artist || !artwork) notFound();
  return <ArtworkDetail artist={artist} artwork={artwork} />;
}
