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
}

/** Fills its (relatively positioned) parent; falls back to a neutral placeholder. */
export function ArtworkImage({ src, alt, sizes, priority, className, fit = "cover" }: ArtworkImageProps) {
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
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}
