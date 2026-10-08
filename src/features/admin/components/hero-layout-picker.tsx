"use client";

import { cn } from "@/lib/utils";
import { HERO_LAYOUTS, type HeroLayout } from "@/types";

const OPTIONS: Record<HeroLayout, { label: string; description: string }> = {
  split: { label: "Split", description: "Text and painting side by side, half each." },
  wide: { label: "Wide", description: "The painting takes about three quarters of the width." },
  overlay: { label: "Overlay", description: "The painting fills the space; text sits on a panel in the centre." },
};

/** Miniature sketch of each layout: bars stand for text, the tinted block for the painting. */
function Sketch({ layout }: { layout: HeroLayout }) {
  const text = (
    <span className="flex flex-col gap-1">
      <span className="h-1.5 w-8 rounded-full bg-foreground/60" />
      <span className="h-1 w-10 rounded-full bg-foreground/30" />
      <span className="h-1 w-6 rounded-full bg-primary/70" />
    </span>
  );
  const painting = "rounded-[2px] bg-gradient-to-br from-primary/50 to-primary/20";

  if (layout === "overlay") {
    return (
      <span className={cn("relative flex h-16 items-center justify-center", painting)}>
        <span className="rounded-[2px] bg-background/85 px-2 py-1.5">{text}</span>
      </span>
    );
  }
  return (
    <span className={cn("grid h-16 items-center gap-2", layout === "split" ? "grid-cols-2" : "grid-cols-[1fr_3fr]")}>
      {text}
      <span className={cn("h-full", painting)} />
    </span>
  );
}

export function HeroLayoutPicker({ value, onChange }: { value: HeroLayout; onChange: (layout: HeroLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Home page layout" className="grid gap-3">
      {HERO_LAYOUTS.map((layout) => {
        const selected = value === layout;
        return (
          <button
            key={layout}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(layout)}
            className={cn(
              "grid grid-cols-[6rem_1fr] items-center gap-4 rounded-sm border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary ring-2 ring-primary/30" : "border-border",
            )}
          >
            <Sketch layout={layout} />
            <span>
              <span className="block text-sm font-medium">{OPTIONS[layout].label}</span>
              <span className="block text-xs text-muted-foreground">{OPTIONS[layout].description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
