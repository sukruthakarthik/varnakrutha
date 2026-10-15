"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Artwork } from "@/types";
import { ArtworkImage } from "./artwork-image";
import { ArtworkLightbox } from "./artwork-lightbox";

export function ArtworkImageGallery({ artwork, caption }: { artwork: Artwork; caption?: string }) {
  const images = artwork.images.length
    ? artwork.images.map((i) => i.imageUrl)
    : artwork.coverImage
      ? [artwork.coverImage]
      : [];
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const current = images[active] ?? null;

  return (
    <div className="space-y-5">
      {/* The painting hangs on a soft "wall" panel, uncropped, with a cast shadow. */}
      <button
        type="button"
        onClick={() => current && setViewerOpen(true)}
        disabled={!current}
        aria-label={`View ${artwork.title} full screen`}
        className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-sm bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:cursor-default md:aspect-[5/4]"
      >
        <span className="absolute inset-6 md:inset-12">
          <ArtworkImage
            key={current}
            src={current}
            alt={`${artwork.title}${images.length > 1 ? ` — image ${active + 1} of ${images.length}` : ""}`}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
            fit="contain"
            className="art-shadow"
          />
        </span>
        {current && (
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-background/85 px-3.5 py-2 text-xs font-medium tracking-wide text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:opacity-100">
            <Expand className="size-3.5" aria-hidden /> View full screen
          </span>
        )}
      </button>

      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto pb-1" aria-label="Artwork images">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-sm ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-24",
                  i === active ? "ring-1 ring-foreground" : "opacity-60 hover:opacity-100",
                )}
              >
                <ArtworkImage src={src} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ArtworkLightbox
        images={images}
        title={artwork.title}
        caption={caption}
        index={active}
        onIndexChange={setActive}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
