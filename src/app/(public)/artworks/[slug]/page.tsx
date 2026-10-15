import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkDetail, artworkMetadata } from "@/features/artworks/artwork-page";
import { getCurrentArtist, getPublicDataSource } from "@/services";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

// The site's own artist's works; other artists' works live under /artists/<artist>/artworks/<slug>.
async function getArtwork(slug: string) {
  const artist = await getCurrentArtist();
  const artwork = await (await getPublicDataSource()).artworks.getBySlug(slug, artist.id);
  return { artist, artwork };
}

export async function generateStaticParams() {
  const artist = await getCurrentArtist();
  const artworks = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });
  return artworks.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, artwork } = await getArtwork((await params).slug);
  return artworkMetadata(artist, artwork);
}

export default async function ArtworkPage({ params }: Props) {
  const { artist, artwork } = await getArtwork((await params).slug);
  if (!artwork) notFound();
  return <ArtworkDetail artist={artist} artwork={artwork} />;
}
