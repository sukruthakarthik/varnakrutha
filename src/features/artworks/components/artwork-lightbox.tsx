"use client";

import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "./artwork-image";

interface ArtworkLightboxProps {
  images: string[];
  title: string;
  /** Shown under the title, e.g. "Watercolour on paper · 2024". */
  caption?: string;
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ZOOM = 2.5;
const SWIPE_THRESHOLD = 50;

/**
 * Full-screen, dark viewer for studying an artwork: arrow keys / swipe to move between images,
 * click (or Z) to zoom in, and the zoomed view pans with the pointer.
 */
export function ArtworkLightbox({ images, title, caption, index, onIndexChange, open, onOpenChange }: ArtworkLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;

  function go(delta: number) {
    if (count < 2) return;
    setZoomed(false);
    onIndexChange((index + delta + count) % count);
  }

  useEffect(() => {
    if (!open) setZoomed(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "z") setZoomed((z) => !z);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pan(e: React.PointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    swipeStart.current = { x: e.clientX, y: e.clientY };
    if (zoomed) pan(e);
  }

  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!zoomed && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    // A tap (not a drag) toggles zoom, centred on where it landed.
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
      pan(e);
      setZoomed((z) => !z);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-[#0e0c0b]/97 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:duration-500" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[70] flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:duration-500"
        >
          <div className="flex items-start justify-between gap-4 px-5 py-4 md:px-8 md:py-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate font-serif text-xl md:text-2xl">{title}</DialogPrimitive.Title>
              {caption && <p className="mt-0.5 truncate text-xs uppercase tracking-[0.18em] text-white/55">{caption}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {count > 1 && (
                <span className="mr-3 font-serif text-sm tabular-nums text-white/60" aria-live="polite">
                  {index + 1} / {count}
                </span>
              )}
              <LightboxButton label={zoomed ? "Zoom out" : "Zoom in"} onClick={() => setZoomed((z) => !z)}>
                {zoomed ? <ZoomOut /> : <ZoomIn />}
              </LightboxButton>
              <DialogPrimitive.Close asChild>
                <LightboxButton label="Close">
                  <X />
                </LightboxButton>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className={cn(
              "relative flex-1 touch-none select-none overflow-hidden",
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={zoomed ? pan : undefined}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="absolute inset-4 transition-transform duration-500 ease-out md:inset-x-24 md:inset-y-6"
              style={{ transform: zoomed ? `scale(${ZOOM})` : undefined, transformOrigin: origin }}
            >
              <ArtworkImage
                key={images[index]}
                src={images[index] ?? null}
                alt={count > 1 ? `${title} — image ${index + 1} of ${count}` : title}
                sizes="100vw"
                quality={90}
                fit="contain"
                priority
              />
            </div>

            {count > 1 && !zoomed && (
              <>
                <LightboxButton label="Previous image" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 md:inline-flex">
                  <ChevronLeft />
                </LightboxButton>
                <LightboxButton label="Next image" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 md:inline-flex">
                  <ChevronRight />
                </LightboxButton>
              </>
            )}
          </div>

          <p className="px-5 py-4 text-center text-xs text-white/40 md:py-5">
            {zoomed ? "Move to explore · tap to zoom out" : count > 1 ? "Tap to zoom · swipe or use ← → to browse" : "Tap to zoom"}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LightboxButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Keep the zoom/swipe surface underneath from treating a button press as a tap.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
