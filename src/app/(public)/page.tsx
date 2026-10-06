import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { ArtworkCard } from "@/features/artworks/components/artwork-card";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { CATEGORY_META } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
import { getCurrentArtist, getPublicDataSource } from "@/services";
import { CATEGORIES } from "@/types";

export const revalidate = 3600;

export default async function HomePage() {
  const artist = await getCurrentArtist();
  const ds = await getPublicDataSource();
  const artworks = await ds.artworks.list({ artistId: artist.id });

  const featured = artworks.filter((a) => a.featured).slice(0, 3);
  const recent = artworks.slice(0, 6);
  const hero = featured[0] ?? artworks[0];
  const categories = CATEGORIES.map((c) => ({
    slug: c,
    ...CATEGORY_META[c],
    count: artworks.filter((a) => a.category === c).length,
    cover: artworks.find((a) => a.category === c && a.coverImage)?.coverImage ?? null,
  })).filter((c) => c.count > 0);

  return (
    <>
      {/* 1. Hero */}
      <section className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="space-y-8">
          <p className="eyebrow">Original works by {artist.name}</p>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">{siteConfig.name}</h1>
          <p className="max-w-xl text-lg text-foreground/75 md:text-xl">{siteConfig.tagline}</p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/gallery">View Gallery</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Contact Artist</Link>
            </Button>
          </div>
        </div>
        {hero && (
          <Link
            href={`/artworks/${hero.slug}`}
            className="group relative block aspect-[4/3] overflow-hidden rounded-sm bg-secondary lg:aspect-[4/5]"
          >
            <ArtworkImage
              src={hero.coverImage}
              alt={hero.title}
              sizes="(min-width: 1024px) 45vw, 100vw"
              priority
              className="transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
              <span className="font-serif text-2xl">{hero.title}</span>
              <span className="block text-xs uppercase tracking-[0.2em] opacity-85">{hero.medium}</span>
            </span>
          </Link>
        )}
      </section>

      {/* 2. Featured */}
      {featured.length > 0 && (
        <section className="container-page py-16 md:py-24" aria-labelledby="featured-heading">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Selected works" title="Featured Artworks" />
            <Link href="/gallery" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              View all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </section>
      )}

      {/* 3. About */}
      <section className="bg-secondary/50 py-16 md:py-24">
        <div className="container-page grid items-center gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-sm bg-secondary">
            {artist.profileImage && (
              <Image src={artist.profileImage} alt={`Portrait of ${artist.name}`} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" />
            )}
          </div>
          <div className="space-y-6">
            <SectionHeading eyebrow="About the artist" title={artist.name} />
            <p className="text-lg leading-relaxed text-foreground/80">{artist.bio}</p>
            <Button asChild variant="outline">
              <Link href="/about">Read her story</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Categories */}
      <section className="container-page py-16 md:py-24">
        <SectionHeading eyebrow="Browse" title="Categories" className="mb-12" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/gallery?category=${c.slug}`}
                className="group relative flex aspect-[3/2] items-end overflow-hidden rounded-sm bg-secondary p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArtworkImage src={c.cover} alt="" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" aria-hidden />
                <span className="relative text-white">
                  <span className="block font-serif text-3xl">{c.label}</span>
                  <span className="text-sm opacity-90">
                    {c.count} {c.count === 1 ? "work" : "works"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Recent */}
      {recent.length > 0 && (
        <section className="container-page py-16 md:py-24">
          <SectionHeading eyebrow="From the studio" title="Recent Works" className="mb-12" />
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Contact CTA */}
      <section className="container-page py-16 md:py-24">
        <div className="rounded-sm bg-foreground px-8 py-16 text-center text-background md:px-16 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-secondary">Commissions & enquiries</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl md:text-5xl">Interested in a painting, or a piece made just for you?</h2>
          <p className="mx-auto mt-4 max-w-xl text-background/75">
            Get in touch to enquire about available works, commissions or exhibitions.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/contact">Contact the Artist</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
