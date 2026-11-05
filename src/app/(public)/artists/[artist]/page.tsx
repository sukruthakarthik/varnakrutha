import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/common/section-heading";
import { SocialLinks } from "@/components/common/social-links";
import { Button } from "@/components/ui/button";
import { Hero } from "@/features/artists/components/hero";
import { GalleryExplorer } from "@/features/artworks/components/gallery-explorer";
import { artistBrand, artistFirstName, artistPath, artworkPath, defaultOpenGraph, isSiteArtist, siteConfig } from "@/lib/site";
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
    title: `${artistBrand(artist.name)} — ${artist.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...defaultOpenGraph,
      type: "profile",
      url,
      title: `${artistBrand(artist.name)} | ${siteConfig.name}`,
      description,
      ...(artist.profileImage ? { images: [{ url: artist.profileImage, alt: artist.name }] } : {}),
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getPublishedArtist((await params).artist);
  if (!artist) notFound();
  const artworks = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });
  const isOwnArtist = isSiteArtist(artist.slug);
  const contactHref = isOwnArtist ? "/contact" : `/contact?artist=${encodeURIComponent(artist.slug)}`;
  const heroArtwork = artworks.find((a) => a.featured) ?? artworks[0];

  return (
    <>
      {/* The artist's portfolio opens with the hero style they chose in their profile. */}
      <Hero
        layout={artist.heroLayout}
        content={{
          eyebrow: `Original paintings · ${siteConfig.name}`,
          lead: "Art by",
          emphasis: artistFirstName(artist.name),
          tagline: artist.tagline ?? `Original artworks by ${artist.name}.`,
          primary: { href: "#works", label: "View works" },
          secondary: { href: contactHref, label: "Commission a piece" },
        }}
        feature={heroArtwork && { artwork: heroArtwork, href: artworkPath(heroArtwork.slug, artist.slug) }}
      />

      <section className="bg-secondary/60 py-20 md:py-28">
        <div className="container-page grid items-center gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-24">
          <div className="reveal relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-full bg-secondary shadow-[0_30px_60px_-30px_rgb(60_38_20/0.45)]">
            {artist.profileImage && (
              <Image src={artist.profileImage} alt={`Portrait of ${artist.name}`} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" />
            )}
          </div>
          <div className="reveal space-y-8">
            <SectionHeading eyebrow="About the artist" title={artist.name} />
            {artist.bio && (
              <p className="text-pretty font-serif text-2xl leading-snug text-foreground/85 md:text-[1.75rem]">{artist.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild variant="outline">
                <Link href={contactHref}>Contact about this artist&apos;s work</Link>
              </Button>
              {isOwnArtist && (
                <Link href="/about" className="link-draw text-xs uppercase tracking-[0.18em]">
                  Full story
                </Link>
              )}
              <SocialLinks artist={artist} />
            </div>
          </div>
        </div>
      </section>

      <section id="works" className="container-page scroll-mt-24 space-y-10 py-20 md:py-28" aria-labelledby="works-heading">
        <h2 id="works-heading" className="text-4xl md:text-5xl">
          Works by <span className="italic">{artist.name}</span>
        </h2>
        <Suspense fallback={<GalleryLoading />}>
          <GalleryExplorer artworks={artworks} artists={[{ id: artist.id, name: artist.name, slug: artist.slug }]} />
        </Suspense>
      </section>
    </>
  );
}
