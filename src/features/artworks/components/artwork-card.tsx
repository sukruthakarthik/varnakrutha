import Link from "next/link";
import { CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Artwork } from "@/types";
import { ArtworkImage } from "./artwork-image";
import { AvailabilityBadge } from "./availability-badge";

interface ArtworkCardProps {
  artwork: Artwork;
  /** "grid": uncropped on an even wall tile. "masonry": the painting's own proportions, edge to edge. */
  layout?: "grid" | "masonry";
  priority?: boolean;
  sizes?: string;
}

export function ArtworkCard({
  artwork,
  layout = "grid",
  priority,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: ArtworkCardProps) {
  const alt = `${artwork.title}${artwork.medium ? ` — ${artwork.medium}` : ""}`;

  return (
    <article className={cn("group reveal", layout === "masonry" && "mb-10 break-inside-avoid")}>
      <Link
        href={`/artworks/${artwork.slug}`}
        className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {layout === "grid" ? (
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted transition-colors duration-500 group-hover:bg-secondary">
            <div className="absolute inset-[11%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.02]">
              <ArtworkImage src={artwork.coverImage} alt={alt} sizes={sizes} priority={priority} fit="contain" className="art-shadow" />
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-sm bg-secondary"
            style={{ aspectRatio: artwork.width && artwork.height ? `${artwork.width} / ${artwork.height}` : "4 / 5" }}
          >
            <ArtworkImage
              src={artwork.coverImage}
              alt={alt}
              sizes={sizes}
              priority={priority}
              className="duration-1000 group-hover:scale-[1.03]"
            />
          </div>
        )}
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="font-serif text-[1.35rem] leading-snug transition-colors group-hover:text-primary">{artwork.title}</h3>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              {[artwork.medium, artwork.year ?? CATEGORY_META[artwork.category].label].filter(Boolean).join(" · ")}
            </p>
          </div>
          {artwork.availability !== "available" && <AvailabilityBadge availability={artwork.availability} />}
        </div>
      </Link>
    </article>
  );
}
