"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtworkImageProps {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
  quality?: number;
}

/** Fills its (relatively positioned) parent and fades in once loaded; falls back to a neutral placeholder. */
export function ArtworkImage({ src, alt, sizes, priority, className, fit = "cover", quality }: ArtworkImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-secondary", className)}>
        <ImageIcon className="size-8 text-secondary-foreground/40" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      draggable={false}
      onLoad={() => setLoaded(true)}
      // `img-fade` lets the root layout's <noscript> style show images when JS is off.
      className={cn(
        "img-fade transition-[opacity,filter,scale] duration-700 ease-out",
        fit === "cover" ? "object-cover" : "object-contain",
        !loaded && "opacity-0 blur-sm",
        className,
      )}
    />
  );
}
