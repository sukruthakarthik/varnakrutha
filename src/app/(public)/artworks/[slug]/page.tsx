import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkCard } from "@/features/artworks/components/artwork-card";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { ArtworkImageGallery } from "@/features/artworks/components/artwork-image-gallery";
import { AvailabilityBadge } from "@/features/artworks/components/availability-badge";
import { ViewOnWall } from "@/features/artworks/components/view-on-wall";
import { CATEGORY_META } from "@/lib/constants";
import { absoluteUrl, defaultOgImage, defaultOpenGraph } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCurrentArtist, getPublicDataSource } from "@/services";
import type { Artwork } from "@/types";
import { formatDimensions, formatPrice, truncate } from "@/utils/format";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

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
  const { slug } = await params;
  const { artist, artwork } = await getArtwork(slug);
  if (!artwork) return { title: "Artwork not found", robots: { index: false } };

  const title = `${artwork.title}${artwork.medium ? ` — ${artwork.medium}` : ""}`;
  const description = truncate(
    artwork.description ?? `${artwork.title} by ${artist.name}. ${CATEGORY_META[artwork.category].label} artwork.`,
    160,
  );
  const url = `/artworks/${artwork.slug}`;
  const images = artwork.coverImage
    ? [{ url: artwork.coverImage, alt: artwork.title }]
    : [defaultOgImage];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...defaultOpenGraph, type: "article", url, title, description, images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const { artist, artwork } = await getArtwork(slug);
  if (!artwork) notFound();

  const all = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });
  const related = all.filter((a) => a.category === artwork.category && a.id !== artwork.id).slice(0, 3);
  // Wraps around, so every work has a neighbour on both sides.
  const position = all.findIndex((a) => a.id === artwork.id);
  const prev = all.length > 1 ? all[(position - 1 + all.length) % all.length] : null;
  const next = all.length > 1 ? all[(position + 1) % all.length] : null;

  const price = formatPrice(artwork.price);
  const dimensions = formatDimensions(artwork.width, artwork.height);
  const enquireHref = `/contact?artwork=${encodeURIComponent(artwork.slug)}`;

  const details = [
    { label: "Year", value: artwork.year?.toString() },
    { label: "Medium", value: artwork.medium },
    { label: "Dimensions", value: dimensions },
    { label: "Category", value: CATEGORY_META[artwork.category].label },
    { label: "Price", value: artwork.availability === "sold" ? null : price },
  ].filter((d): d is { label: string; value: string } => Boolean(d.value));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    description: artwork.description ?? undefined,
    image: artwork.coverImage ? absoluteUrl(artwork.coverImage) : undefined,
    url: absoluteUrl(`/artworks/${artwork.slug}`),
    artform: "Painting",
    artMedium: artwork.medium ?? undefined,
    dateCreated: artwork.year?.toString(),
    width: artwork.width ? { "@type": "Distance", name: `${artwork.width} cm` } : undefined,
    height: artwork.height ? { "@type": "Distance", name: `${artwork.height} cm` } : undefined,
    creator: { "@type": "Person", name: artist.name },
    offers:
      artwork.price && artwork.availability !== "sold"
        ? {
            "@type": "Offer",
            price: artwork.price,
            priceCurrency: "INR",
            availability:
              artwork.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
          }
        : undefined,
  };

  return (
    <article className="container-page py-10 md:py-16">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link
        href="/gallery"
        className="group mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden /> Back to gallery
      </Link>

      <div className="grid gap-12 lg:grid-cols-[1.45fr_1fr] lg:gap-20">
        <div className="animate-in fade-in fill-mode-both duration-1000">
          <ArtworkImageGallery
            artwork={artwork}
            caption={[artwork.medium, artwork.year, dimensions].filter(Boolean).join(" · ")}
          />
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 fill-mode-both delay-150 duration-1000 lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-4">
            <AvailabilityBadge availability={artwork.availability} />
            <h1 className="text-balance text-5xl leading-[1.02] tracking-[-0.015em] md:text-6xl">{artwork.title}</h1>
            <p className="font-serif text-lg italic text-muted-foreground">by {artist.name}</p>
          </div>

          {artwork.description && <p className="text-pretty text-lg leading-relaxed text-foreground/80">{artwork.description}</p>}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-6 text-sm">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{d.label}</dt>
                <dd className="mt-1">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row">
            {artwork.availability !== "sold" && (
              <Button asChild size="lg" className="flex-1">
                <Link href={enquireHref}>
                  <ShoppingBag aria-hidden /> Enquire About Purchase
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href="/contact">
                <Mail aria-hidden /> Contact Artist
              </Link>
            </Button>
          </div>
          {artwork.availability === "sold" && (
            <p className="text-sm text-muted-foreground">
              This work has found a home. Get in touch about similar pieces or a commission.
            </p>
          )}
          {artwork.width && artwork.height ? (
            <ViewOnWall artwork={{ ...artwork, width: artwork.width, height: artwork.height }} />
          ) : null}
        </div>
      </div>

      {artwork.story && (
        <section className="reveal mx-auto mt-28 max-w-2xl space-y-6 md:mt-36" aria-labelledby="story-heading">
          <p className="eyebrow text-center">Behind the canvas</p>
          <h2 id="story-heading" className="text-balance text-center text-4xl md:text-5xl">
            The Story Behind the Artwork
          </h2>
          <div className="space-y-6 pt-4 first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-primary">
            {artwork.story.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="text-pretty font-serif text-xl leading-relaxed text-foreground/85 md:text-[1.35rem]">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {prev && next && (
        <nav aria-label="More artworks" className="mt-28 grid border-y border-foreground/10 sm:grid-cols-2">
          <AdjacentLink artwork={prev} direction="prev" />
          <AdjacentLink artwork={next} direction="next" />
        </nav>
      )}

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-heading">
          <h2 id="related-heading" className="reveal mb-12 text-4xl md:text-5xl">
            More in <span className="italic">{CATEGORY_META[artwork.category].label}</span>
          </h2>
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function AdjacentLink({ artwork, direction }: { artwork: Artwork; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      rel={direction}
      className={cn(
        "group flex items-center gap-5 py-8 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6",
        isNext && "flex-row-reverse text-right sm:border-l sm:border-foreground/10",
      )}
    >
      <span className="relative size-20 shrink-0 md:size-24">
        <ArtworkImage src={artwork.coverImage} alt="" sizes="96px" fit="contain" className="art-shadow" />
      </span>
      <span className="min-w-0">
        <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
          {!isNext && <Arrow className="size-3.5 transition-transform group-hover:-translate-x-1" aria-hidden />}
          {isNext ? "Next work" : "Previous work"}
          {isNext && <Arrow className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />}
        </span>
        <span className="mt-1 block truncate font-serif text-2xl transition-colors group-hover:text-primary">{artwork.title}</span>
      </span>
    </Link>
  );
}
