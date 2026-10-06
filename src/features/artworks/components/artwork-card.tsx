import Link from "next/link";
import { CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { truncate } from "@/utils/format";
import type { Artwork } from "@/types";
import { ArtworkImage } from "./artwork-image";
import { AvailabilityBadge } from "./availability-badge";

interface ArtworkCardProps {
  artwork: Artwork;
  layout?: "grid" | "masonry";
  priority?: boolean;
}

export function ArtworkCard({ artwork, layout = "grid", priority }: ArtworkCardProps) {
  const ratio =
    layout === "masonry" && artwork.width && artwork.height
      ? `${artwork.width} / ${artwork.height}`
      : "4 / 5";

  return (
    <article className={cn("group", layout === "masonry" && "mb-8 break-inside-avoid")}>
      <Link
        href={`/artworks/${artwork.slug}`}
        className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        <div className="relative overflow-hidden rounded-sm bg-secondary" style={{ aspectRatio: ratio }}>
          <ArtworkImage
            src={artwork.coverImage}
            alt={`${artwork.title}${artwork.medium ? ` — ${artwork.medium}` : ""}`}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl leading-snug group-hover:text-primary">{artwork.title}</h3>
            <AvailabilityBadge availability={artwork.availability} />
          </div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {[artwork.medium, CATEGORY_META[artwork.category].label].filter(Boolean).join(" · ")}
          </p>
          {artwork.description && (
            <p className="text-sm text-foreground/75">{truncate(artwork.description, 110)}</p>
          )}
        </div>
      </Link>
    </article>
  );
}
