import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Artist, Artwork } from "@/types";

interface HomeHeroProps {
  artist: Artist;
  /** The artwork to showcase; the hero still renders without one. */
  artwork: Artwork | undefined;
}

/** Home page hero, arranged according to the artist's chosen layout. */
export function HomeHero({ artist, artwork }: HomeHeroProps) {
  switch (artist.heroLayout) {
    case "split":
      return <SplitHero artist={artist} artwork={artwork} />;
    case "overlay":
      return <OverlayHero artist={artist} artwork={artwork} />;
    default:
      return <WideHero artist={artist} artwork={artwork} />;
  }
}

function HeroText({ artist, size, centered }: { artist: Artist; size: "large" | "compact"; centered?: boolean }) {
  return (
    <div className={cn("space-y-6", centered && "text-center")}>
      <p className="eyebrow">Original works by {artist.name}</p>
      <h1
        className={cn(
          "leading-[1.05]",
          size === "large" ? "text-5xl sm:text-6xl lg:text-7xl" : "text-4xl sm:text-5xl",
        )}
      >
        {siteConfig.name}
      </h1>
      <p className={cn("text-foreground/75", size === "large" ? "max-w-xl text-lg md:text-xl" : "text-base md:text-lg", centered && "mx-auto")}>
        {artist.tagline ?? siteConfig.tagline}
      </p>
      <div className={cn("flex flex-wrap gap-3 pt-2 lg:flex-nowrap", centered && "justify-center")}>
        <Button asChild size={size === "large" ? "lg" : "default"}>
          <Link href="/gallery">View Gallery</Link>
        </Button>
        <Button asChild size={size === "large" ? "lg" : "default"} variant="outline">
          <Link href="/contact">Contact Artist</Link>
        </Button>
      </div>
    </div>
  );
}

/** The artwork with its title over a gradient; fills its (relatively positioned) container. */
function ArtworkPanel({ artwork, sizes, className }: { artwork: Artwork; sizes: string; className: string }) {
  return (
    <Link href={`/artworks/${artwork.slug}`} className={cn("group relative block overflow-hidden rounded-sm bg-secondary", className)}>
      <ArtworkImage
        src={artwork.coverImage}
        alt={artwork.title}
        sizes={sizes}
        priority
        className="transition-transform duration-700 group-hover:scale-[1.02]"
      />
      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white md:p-8">
        <span className="font-serif text-2xl md:text-3xl">{artwork.title}</span>
        <span className="block text-xs uppercase tracking-[0.2em] opacity-85">{artwork.medium}</span>
      </span>
    </Link>
  );
}

/** Text and artwork side by side, half each, vertically centred against each other. */
function SplitHero({ artist, artwork }: HomeHeroProps) {
  return (
    <section className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 lg:order-1">
        <HeroText artist={artist} size="large" />
      </div>
      {artwork && (
        <ArtworkPanel
          artwork={artwork}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="order-1 aspect-[4/3] lg:order-2 lg:aspect-[4/5] lg:max-h-[78vh] lg:w-full"
        />
      )}
    </section>
  );
}

/**
 * "Breakout" grid on large screens: [margin] [text, aligned with the header's content edge]
 * [artwork, running to the screen's right edge]. The outer columns mirror .container-page
 * (80rem wide, 2rem padding), so 24rem + 52rem = 76rem of content.
 */
function WideHero({ artist, artwork }: HomeHeroProps) {
  return (
    <section className="grid items-center gap-8 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(2rem,1fr)_minmax(0,24rem)_minmax(0,52rem)_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:py-14">
      <div className="order-2 lg:order-1 lg:col-start-2 lg:pr-12">
        <HeroText artist={artist} size="compact" />
      </div>
      {artwork && (
        <ArtworkPanel
          artwork={artwork}
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="order-1 aspect-[4/3] sm:aspect-[16/10] lg:order-2 lg:col-span-2 lg:col-start-3 lg:aspect-auto lg:h-[min(78vh,46rem)] lg:rounded-r-none"
        />
      )}
    </section>
  );
}

/** The artwork fills the hero; the text sits on a mostly opaque panel in the centre. */
function OverlayHero({ artist, artwork }: HomeHeroProps) {
  return (
    <section className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden bg-secondary px-5 py-16 md:min-h-[min(85vh,52rem)]">
      {artwork && (
        <ArtworkImage src={artwork.coverImage} alt={artwork.title} sizes="100vw" priority className="-z-10" />
      )}
      <div className="w-full max-w-xl rounded-sm bg-background/85 p-8 shadow-xl backdrop-blur-md md:p-12">
        <HeroText artist={artist} size="compact" centered />
      </div>
      {artwork && (
        <Link
          href={`/artworks/${artwork.slug}`}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/70 md:bottom-6 md:right-6"
        >
          <span className="font-serif text-base">{artwork.title}</span>
          {artwork.medium && <span className="text-xs uppercase tracking-[0.15em] opacity-80">{artwork.medium}</span>}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}
