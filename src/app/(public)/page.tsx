import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { Hero } from "@/features/artists/components/hero";
import { ArtworkCard } from "@/features/artworks/components/artwork-card";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { CATEGORY_META } from "@/lib/constants";
import { artistBrand, artistPath, artworkPath, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getPublishedArtists, getPublishedArtworks } from "@/services";
import { CATEGORIES } from "@/types";

export const revalidate = 3600;

// The home page is the platform's front door: every approved artist's work, newest first.
// Each artist's own portfolio (with the hero style they chose) lives at /artists/<slug>.
export default async function HomePage() {
  const [artists, artworks] = await Promise.all([getPublishedArtists(), getPublishedArtworks()]);
  const artistById = new Map(artists.map((a) => [a.id, { name: a.name, slug: a.slug }]));
  const credit = (artistId: string) => artistById.get(artistId) ?? { name: "", slug: siteConfig.defaultArtistSlug };

  const hero = artworks.find((a) => a.featured) ?? artworks[0];
  // The hero already shows one artwork large, so the Featured section skips it.
  const featured = artworks.filter((a) => a.featured && a.id !== hero?.id).slice(0, 3);
  const recent = artworks.slice(0, 8);
  const categories = CATEGORIES.map((c) => ({
    slug: c,
    ...CATEGORY_META[c],
    count: artworks.filter((a) => a.categories.includes(c)).length,
    cover: artworks.find((a) => a.categories.includes(c) && a.coverImage)?.coverImage ?? null,
  })).filter((c) => c.count > 0);
  // Artists with work to show first, then the rest; the section shows a few and links to all.
  const meet = [...artists]
    .map((artist) => ({ artist, works: artworks.filter((a) => a.artistId === artist.id) }))
    .sort((a, b) => Number(b.works.length > 0) - Number(a.works.length > 0))
    .slice(0, 3);

  return (
    <>
      {/* 1. Hero */}
      <Hero
        layout="wide"
        content={{
          eyebrow: artists.length > 1 ? `Original paintings · ${artists.length} artists` : "Original paintings",
          lead: siteConfig.name,
          emphasis: artists.length > 1 ? "Art by many hands" : "Original art",
          tagline: siteConfig.tagline,
          primary: { href: "/gallery", label: "View Gallery" },
          secondary: { href: "/artists", label: "Meet the artists" },
        }}
        feature={
          hero && {
            artwork: hero,
            href: artworkPath(hero.slug, credit(hero.artistId).slug),
            credit: credit(hero.artistId).name || undefined,
          }
        }
      />

      {/* 2. Featured — editorial: one large work, the rest stacked beside it */}
      {featured.length > 0 && (
        <section className="container-page py-20 md:py-32" aria-labelledby="featured-heading">
          <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-20">
            <SectionHeading id="featured-heading" eyebrow="Selected works" title="Featured Artworks" />
            <Link href="/gallery" className="link-draw group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
              View all works <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <ol className="grid gap-x-16 gap-y-16 lg:grid-cols-12">
            {featured.map((a, i) => (
              <li
                key={a.id}
                className={cn(
                  i === 0 ? "lg:col-span-7 lg:row-span-2" : "lg:col-span-4 lg:col-start-9",
                  i === 2 && "lg:mt-4",
                )}
              >
                <div className="mb-4 flex items-center gap-3 font-serif text-sm text-muted-foreground">
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px flex-1 bg-foreground/15" aria-hidden />
                </div>
                <ArtworkCard
                  artwork={a}
                  artist={credit(a.artistId)}
                  showArtist
                  sizes={i === 0 ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3. Meet the artists */}
      {meet.length > 0 && (
        <section className="bg-secondary/60 py-20 md:py-32" aria-labelledby="artists-heading">
          <div className="container-page">
            <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-20">
              <SectionHeading id="artists-heading" eyebrow="The artists" title="Meet the Artists" />
              <Link href="/artists" className="link-draw group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
                All artists <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {meet.map(({ artist, works }) => (
                <li key={artist.id} className="reveal">
                  <Link
                    href={artistPath(artist.slug)}
                    className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                  >
                    <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-t-full bg-secondary shadow-[0_30px_60px_-34px_rgb(60_38_20/0.5)]">
                      <ArtworkImage
                        src={artist.profileImage ?? works[0]?.coverImage ?? null}
                        alt={`Portrait of ${artist.name}`}
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
                        className="duration-[1400ms] group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="mt-6 text-center">
                      <h3 className="font-serif text-3xl transition-colors group-hover:text-primary">{artist.name}</h3>
                      <p className="mt-1 font-serif text-base italic text-foreground/70">{artistBrand(artist.name)}</p>
                      <p className="mt-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {works.length} {works.length === 1 ? "work" : "works"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 4. Categories */}
      <section className="container-page py-20 md:py-32">
        <SectionHeading eyebrow="Browse" title="Categories" className="reveal mb-14" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug} className="reveal">
              <Link
                href={`/gallery?category=${c.slug}`}
                className="group relative flex aspect-[3/2] items-end overflow-hidden rounded-sm bg-secondary p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:p-8"
              >
                <ArtworkImage
                  src={c.cover}
                  alt=""
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="duration-[1400ms] group-hover:scale-[1.06]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
                <span className="relative flex w-full items-end justify-between gap-4 text-white">
                  <span>
                    <span className="block font-serif text-3xl transition-transform duration-500 group-hover:-translate-y-1 md:text-4xl">
                      {c.label}
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] opacity-85">
                      {c.count} {c.count === 1 ? "work" : "works"}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-5 shrink-0 -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Recent — a horizontal rail, each work at its own proportions like a hung row */}
      {recent.length > 0 && (
        <section className="py-20 md:py-32" aria-labelledby="recent-heading">
          <div className="container-page reveal mb-12 flex flex-wrap items-end justify-between gap-6">
            <SectionHeading id="recent-heading" eyebrow="Fresh on the walls" title="Recent Works" />
            <p className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground md:block">Scroll to browse →</p>
          </div>
          <ul
            className="no-scrollbar flex snap-x snap-mandatory items-end gap-8 overflow-x-auto px-5 pb-6 pt-4 md:gap-14 md:px-8 lg:scroll-px-[max(2rem,calc((100vw-76rem)/2))] lg:px-[max(2rem,calc((100vw-76rem)/2))]"
            aria-label="Recent works"
          >
            {recent.map((a) => (
              <li key={a.id} className="shrink-0 snap-start">
                <Link href={artworkPath(a.slug, credit(a.artistId).slug)} className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
                  <div
                    className="relative h-64 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 md:h-[22rem]"
                    style={{ aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : "4 / 5" }}
                  >
                    <ArtworkImage src={a.coverImage} alt={a.title} sizes="(min-width: 768px) 30rem, 80vw" className="art-shadow" />
                  </div>
                  <p className="mt-5 font-serif text-lg transition-colors group-hover:text-primary">{a.title}</p>
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {[credit(a.artistId).name && `by ${credit(a.artistId).name}`, a.medium].filter(Boolean).join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. Contact CTA */}
      <section className="container-page pb-8 pt-4">
        <div className="reveal relative isolate overflow-hidden rounded-sm bg-[#1d1a17] px-8 py-20 text-center text-[#faf7f2] md:px-16 md:py-28">
          {hero?.coverImage && (
            <ArtworkImage src={hero.coverImage} alt="" sizes="100vw" className="-z-10 opacity-25 mix-blend-luminosity" />
          )}
          <span className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1d1a17]/30 to-[#1d1a17]" aria-hidden />
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#e9c9a8]">Commissions & enquiries</p>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance text-4xl leading-[1.05] md:text-6xl">
            Bring an original home, or commission one painted <span className="italic text-[#e9c9a8]">just for you</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[#faf7f2]/70">
            Enquire about an available work, or commission a piece of a place, a temple or a memory that matters to you.
          </p>
          <Button asChild size="lg" className="group mt-10 bg-[#faf7f2] text-[#1d1a17] hover:bg-[#e9c9a8]">
            <Link href="/contact">
              Get in touch <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
