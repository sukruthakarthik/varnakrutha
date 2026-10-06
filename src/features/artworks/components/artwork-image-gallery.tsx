"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Artwork } from "@/types";
import { ArtworkImage } from "./artwork-image";

export function ArtworkImageGallery({ artwork }: { artwork: Artwork }) {
  const images = artwork.images.length
    ? artwork.images.map((i) => i.imageUrl)
    : artwork.coverImage
      ? [artwork.coverImage]
      : [];
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary/60 md:aspect-[5/4]">
        <ArtworkImage
          src={current}
          alt={`${artwork.title}${images.length > 1 ? ` — image ${active + 1} of ${images.length}` : ""}`}
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
          fit="contain"
        />
      </div>
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
                  "relative block size-20 overflow-hidden rounded-sm ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-24",
                  i === active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                )}
              >
                <ArtworkImage src={src} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
