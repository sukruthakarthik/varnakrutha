"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Grid3X3, LayoutDashboard, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Artwork, type Category } from "@/types";
import { ArtworkCard } from "./artwork-card";

type ViewMode = "grid" | "masonry";

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

export function GalleryExplorer({ artworks }: { artworks: Artwork[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const categoryParam = params.get("category");
  const category = isCategory(categoryParam) ? categoryParam : null;
  const query = params.get("q") ?? "";
  const view: ViewMode = params.get("view") === "masonry" ? "masonry" : "grid";

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artworks.filter((a) => {
      if (category && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        CATEGORY_META[a.category].label.toLowerCase().includes(q) ||
        (a.medium?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [artworks, category, query]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-y border-border py-6 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <FilterChip active={!category} onClick={() => update({ category: null })}>
            All
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => update({ category: c })}>
              {CATEGORY_META[c].label}
            </FilterChip>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="gallery-search" className="sr-only">
              Search by title or category
            </label>
            <Input
              id="gallery-search"
              type="search"
              placeholder="Search title or category"
              defaultValue={query}
              onChange={(e) => update({ q: e.target.value || null })}
              className="pl-9"
            />
          </div>
          <div role="group" aria-label="View mode" className="flex shrink-0 rounded-sm border border-input">
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              onClick={() => update({ view: null })}
              className={cn("rounded-none", view === "grid" && "bg-secondary")}
            >
              <Grid3X3 />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={view === "masonry"}
              aria-label="Masonry view"
              onClick={() => update({ view: "masonry" })}
              className={cn("rounded-none", view === "masonry" && "bg-secondary")}
            >
              <LayoutDashboard />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "artwork" : "artworks"}
        {category ? ` in ${CATEGORY_META[category].label}` : ""}
        {query ? ` matching “${query}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No artworks found"
          description="Try a different category or search term."
          action={
            <Button variant="outline" onClick={() => update({ category: null, q: null })}>
              Clear filters
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <ArtworkCard key={a.id} artwork={a} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
          {filtered.map((a, i) => (
            <ArtworkCard key={a.id} artwork={a} layout="masonry" priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/15 text-foreground/80 hover:border-foreground/50",
      )}
    >
      {children}
    </button>
  );
}
