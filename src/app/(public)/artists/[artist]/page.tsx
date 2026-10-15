import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SocialLinks } from "@/components/common/social-links";
import { Button } from "@/components/ui/button";
import { GalleryExplorer } from "@/features/artworks/components/gallery-explorer";
import { artistPath, defaultOpenGraph, siteConfig } from "@/lib/site";
import { getPublicDataSource, getPublishedArtist } from "@/services";
import { truncate } from "@/utils/format";
import GalleryLoading from "../../gallery/loading";

export const revalidate = 3600;

type Props = { params: Promise<{ artist: string }> };

// Rendered on first visit, then cached; newly approved artists appear without a rebuild.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getPublishedArtist((await params).artist);
  if (!artist) return { title: "Artist not found", robots: { index: false } };
  const description = truncate(artist.bio ?? `Original artworks by ${artist.name}.`, 160);
  const url = artistPath(artist.slug);
  return {
    title: artist.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...defaultOpenGraph,
      type: "profile",
      url,
      title: `${artist.name} | ${siteConfig.name}`,
      description,
      ...(artist.profileImage ? { images: [{ url: artist.profileImage, alt: artist.name }] } : {}),
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getPublishedArtist((await params).artist);
  if (!artist) notFound();
  const artworks = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });
  const isOwnArtist = artist.slug === siteConfig.defaultArtistSlug;

  return (
    <div className="py-16 md:py-20">
      <section className="container-page grid items-center gap-12 md:grid-cols-[0.7fr_1.3fr] md:gap-20">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-t-full bg-secondary shadow-[0_30px_60px_-30px_rgb(60_38_20/0.45)] animate-in fade-in fill-mode-both duration-1000">
          {artist.profileImage && (
            <Image
              src={artist.profileImage}
              alt={`Portrait of ${artist.name}`}
              fill
              priority
              sizes="(min-width: 768px) 25vw, 80vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 fill-mode-both delay-150 duration-1000">
          <p className="eyebrow">Artist</p>
          <h1 className="text-balance text-5xl leading-[1.02] tracking-[-0.015em] md:text-7xl">{artist.name}</h1>
          {artist.tagline && <p className="text-lg text-foreground/70">{artist.tagline}</p>}
          {artist.bio && (
            <p className="max-w-2xl text-pretty font-serif text-xl leading-relaxed text-foreground/85">{artist.bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="outline">
              <Link href={isOwnArtist ? "/contact" : `/contact?artist=${encodeURIComponent(artist.slug)}`}>
                Contact about this artist&apos;s work
              </Link>
            </Button>
            {isOwnArtist && (
              <Link href="/about" className="link-draw text-xs uppercase tracking-[0.18em]">
                Full story
              </Link>
            )}
            <SocialLinks artist={artist} />
          </div>
        </div>
      </section>

      <section className="container-page mt-20 space-y-10 md:mt-28" aria-labelledby="works-heading">
        <h2 id="works-heading" className="text-4xl md:text-5xl">
          Works by <span className="italic">{artist.name}</span>
        </h2>
        <Suspense fallback={<GalleryLoading />}>
          <GalleryExplorer artworks={artworks} artists={[{ id: artist.id, name: artist.name, slug: artist.slug }]} />
        </Suspense>
      </section>
    </div>
  );
}
