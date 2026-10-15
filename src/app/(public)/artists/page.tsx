import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { artistBrand, artistPath, defaultOpenGraph, siteConfig } from "@/lib/site";
import { getPublishedArtists, getPublishedArtworks } from "@/services";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Artists",
  description: "Meet the artists featured on Varnakrutha and browse their original paintings.",
  alternates: { canonical: "/artists" },
  openGraph: { ...defaultOpenGraph, url: "/artists", title: `Artists | ${siteConfig.name}` },
};

export default async function ArtistsPage() {
  const [artists, artworks] = await Promise.all([getPublishedArtists(), getPublishedArtworks()]);
  const worksBy = (artistId: string) => artworks.filter((a) => a.artistId === artistId);

  return (
    <div className="container-page space-y-14 py-16 md:py-20">
      <SectionHeading
        as="h1"
        eyebrow="The artists"
        title="Artists"
        description="Painters whose work is featured here. Open a portfolio to see every piece."
      />
      <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => {
          const works = worksBy(artist.id);
          // A portrait if there is one, otherwise the artist's latest work.
          const image = artist.profileImage ?? works[0]?.coverImage ?? null;
          return (
            <li key={artist.id} className="reveal">
              <Link
                href={artistPath(artist.slug)}
                className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-secondary shadow-[0_30px_60px_-34px_rgb(60_38_20/0.5)]">
                  <ArtworkImage
                    src={image}
                    alt={`${artist.name}`}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="duration-[1400ms] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-3xl transition-colors group-hover:text-primary">{artist.name}</h2>
                    <p className="mt-1 font-serif text-base italic text-foreground/70">{artistBrand(artist.name)}</p>
                    {artist.tagline && <p className="mt-1 text-sm text-muted-foreground">{artist.tagline}</p>}
                    <p className="mt-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {works.length} {works.length === 1 ? "work" : "works"}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-5 shrink-0 -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
