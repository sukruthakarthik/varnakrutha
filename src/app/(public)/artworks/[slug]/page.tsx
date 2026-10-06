import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkCard } from "@/features/artworks/components/artwork-card";
import { ArtworkImageGallery } from "@/features/artworks/components/artwork-image-gallery";
import { AvailabilityBadge } from "@/features/artworks/components/availability-badge";
import { CATEGORY_META } from "@/lib/constants";
import { absoluteUrl, defaultOgImage, defaultOpenGraph } from "@/lib/site";
import { getCurrentArtist, getPublicDataSource } from "@/services";
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

  const related = (
    await (await getPublicDataSource()).artworks.list({ artistId: artist.id, category: artwork.category, limit: 4 })
  )
    .filter((a) => a.id !== artwork.id)
    .slice(0, 3);

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
      <Link href="/gallery" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to gallery
      </Link>

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <ArtworkImageGallery artwork={artwork} />

        <div className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-4">
            <AvailabilityBadge availability={artwork.availability} />
            <h1 className="text-4xl leading-tight md:text-5xl">{artwork.title}</h1>
            <p className="text-sm text-muted-foreground">by {artist.name}</p>
          </div>

          {artwork.description && <p className="text-lg leading-relaxed text-foreground/80">{artwork.description}</p>}

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
        </div>
      </div>

      {artwork.story && (
        <section className="mx-auto mt-20 max-w-3xl space-y-6" aria-labelledby="story-heading">
          <p className="eyebrow">Behind the canvas</p>
          <h2 id="story-heading" className="text-3xl md:text-4xl">
            The Story Behind the Artwork
          </h2>
          {artwork.story.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-foreground/80">
              {p}
            </p>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-10 text-3xl">
            More in {CATEGORY_META[artwork.category].label}
          </h2>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
