"use client";

import { useState } from "react";
import { Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Artwork } from "@/types";
import { ArtworkImage } from "./artwork-image";

const WALLS = [
  { name: "Warm white", color: "#ece5da" },
  { name: "Sage", color: "#b7c0aa" },
  { name: "Terracotta", color: "#c58b6a" },
  { name: "Indigo", color: "#3f4a63" },
  { name: "Charcoal", color: "#37332f" },
] as const;

const FRAMES = [
  { name: "No frame", color: null },
  { name: "Black", color: "#1b1917" },
  { name: "Oak", color: "#b48a5a" },
  { name: "Gold", color: "#b8954a" },
] as const;

// Everything is laid out in centimetres, then converted to percentages of the scene.
const SOFA = { width: 210, height: 85 };
const FRAME_CM = 3;
const GAP_ABOVE_SOFA = 25;
const SCENE_RATIO = 16 / 10;
/** Share of the scene's height taken by the floor strip. */
const FLOOR = 0.12;

/**
 * Shows the artwork at true scale above a 210 cm sofa, so a buyer can judge its size.
 * Needs the artwork's physical width and height.
 */
export function ViewOnWall({ artwork }: { artwork: Artwork & { width: number; height: number } }) {
  const [wall, setWall] = useState<(typeof WALLS)[number]>(WALLS[0]);
  const [frame, setFrame] = useState<(typeof FRAMES)[number]>(FRAMES[1]);

  const f = frame.color ? FRAME_CM : 0;
  const outerW = artwork.width + 2 * f;
  const outerH = artwork.height + 2 * f;
  const bottomAboveFloor = SOFA.height + GAP_ABOVE_SOFA;

  // Widen the room until both the painting and the sofa fit with breathing space.
  const roomW = Math.max(420, outerW * 1.6, SOFA.width * 1.9, ((bottomAboveFloor + outerH + 40) / (1 - FLOOR)) * SCENE_RATIO);
  const roomH = roomW / SCENE_RATIO;
  const x = (cm: number) => `${(cm / roomW) * 100}%`;
  const y = (cm: number) => `${(cm / roomH) * 100}%`;
  const fromFloor = (cm: number) => `calc(${FLOOR * 100}% + ${y(cm)})`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="ghost" className="w-full border border-dashed border-foreground/20">
          <Sofa aria-hidden /> View on a wall
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-5xl gap-5 overflow-y-auto p-4 md:p-6">
        <div className="pr-8">
          <DialogTitle>{artwork.title}, to scale</DialogTitle>
          <DialogDescription>
            {artwork.width} × {artwork.height} cm, shown above a {SOFA.width} cm sofa.
          </DialogDescription>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-sm transition-colors duration-500"
          style={{ aspectRatio: `${SCENE_RATIO}`, backgroundColor: wall.color }}
          role="img"
          aria-label={`${artwork.title} hung on a ${wall.name.toLowerCase()} wall above a sofa`}
        >
          {/* Soft light falling from above */}
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgb(255_255_255/0.35),transparent_65%)]" aria-hidden />
          {/* Floor and skirting */}
          <span
            className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#9c7653] to-[#7a5a3e]"
            style={{ height: `${FLOOR * 100}%` }}
            aria-hidden
          />
          <span className="absolute inset-x-0 h-[1.2%] bg-[#f3eee7]/80" style={{ bottom: `${FLOOR * 100}%` }} aria-hidden />

          {/* The artwork */}
          <div
            className="absolute -translate-x-1/2 transition-[width,height,background-color] duration-500"
            style={{
              left: "50%",
              bottom: fromFloor(bottomAboveFloor),
              width: x(outerW),
              height: y(outerH),
              backgroundColor: frame.color ?? "transparent",
              boxShadow: "0 0.6em 1.4em -0.3em rgb(0 0 0 / 0.45), 0 0.15em 0.3em rgb(0 0 0 / 0.25)",
              fontSize: "clamp(6px, 1.4vw, 14px)",
            }}
          >
            <div className="absolute overflow-hidden" style={{ inset: `${(f / outerH) * 100}% ${(f / outerW) * 100}%` }}>
              <ArtworkImage src={artwork.coverImage} alt="" sizes="40vw" />
            </div>
          </div>

          {/* Sofa, drawn to its real width */}
          <svg
            viewBox={`0 0 ${SOFA.width} ${SOFA.height}`}
            className="absolute -translate-x-1/2 drop-shadow-[0_6px_6px_rgb(0_0_0/0.25)]"
            style={{ left: "50%", bottom: `calc(${FLOOR * 100}% - ${y(4)})`, width: x(SOFA.width), height: y(SOFA.height) }}
            preserveAspectRatio="none"
            aria-hidden
          >
            <rect x="8" y="0" width="194" height="52" rx="10" fill="#5f6b63" />
            <rect x="0" y="30" width="26" height="45" rx="9" fill="#56615a" />
            <rect x="184" y="30" width="26" height="45" rx="9" fill="#56615a" />
            <rect x="20" y="44" width="170" height="28" rx="6" fill="#6b776f" />
            <line x1="105" y1="46" x2="105" y2="70" stroke="#56615a" strokeWidth="1.5" />
            <rect x="14" y="74" width="6" height="11" fill="#3a2c20" />
            <rect x="190" y="74" width="6" height="11" fill="#3a2c20" />
          </svg>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <OptionGroup label="Wall">
            {WALLS.map((w) => (
              <button
                key={w.name}
                type="button"
                role="radio"
                aria-checked={wall.name === w.name}
                aria-label={w.name}
                title={w.name}
                onClick={() => setWall(w)}
                className={cn(
                  "size-8 rounded-full ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  wall.name === w.name ? "ring-2 ring-foreground" : "ring-1 ring-foreground/20 hover:ring-foreground/50",
                )}
                style={{ backgroundColor: w.color }}
              />
            ))}
          </OptionGroup>
          <OptionGroup label="Frame">
            {FRAMES.map((fr) => (
              <button
                key={fr.name}
                type="button"
                role="radio"
                aria-checked={frame.name === fr.name}
                onClick={() => setFrame(fr)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  frame.name === fr.name
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 text-foreground/75 hover:border-foreground/50",
                )}
              >
                {fr.name}
              </button>
            ))}
          </OptionGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="eyebrow mr-1 text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}
