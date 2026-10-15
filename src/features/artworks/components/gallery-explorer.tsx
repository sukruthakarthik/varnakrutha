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

export interface GalleryArtist {
  id: string;
  name: string;
  slug: string;
}

/**
 * `artists` lists whose work is shown. With more than one, the gallery adds an artist filter and credits
 * each card; with one (an artist's own page), it links to that artist's works without crediting.
 */
export function GalleryExplorer({ artworks, artists }: { artworks: Artwork[]; artists: GalleryArtist[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const categoryParam = params.get("category");
  const category = isCategory(categoryParam) ? categoryParam : null;
  const query = params.get("q") ?? "";
  const view: ViewMode = params.get("view") === "masonry" ? "masonry" : "grid";
  const byId = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);
  const multiArtist = artists.length > 1;
  const artistParam = params.get("artist");
  const selectedArtist = multiArtist ? (artists.find((a) => a.slug === artistParam) ?? null) : null;

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const counts = useMemo(() => {
    const byCategory: Partial<Record<Category, number>> = {};
    for (const a of artworks) {
      if (selectedArtist && a.artistId !== selectedArtist.id) continue;
      byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    }
    return byCategory;
  }, [artworks, selectedArtist]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artworks.filter((a) => {
      if (selectedArtist && a.artistId !== selectedArtist.id) return false;
      if (category && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        CATEGORY_META[a.category].label.toLowerCase().includes(q) ||
        (a.medium?.toLowerCase().includes(q) ?? false) ||
        (byId.get(a.artistId)?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [artworks, category, query, selectedArtist, byId]);
  const total = selectedArtist ? artworks.filter((a) => a.artistId === selectedArtist.id).length : artworks.length;

  return (
    <div className="space-y-10">
      {multiArtist && (
        <div role="group" aria-label="Filter by artist" className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-2 text-muted-foreground">Artist</span>
          {[null, ...artists].map((artist) => {
            const active = (selectedArtist?.id ?? null) === (artist?.id ?? null);
            return (
              <button
                key={artist?.id ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => update({ artist: artist?.slug ?? null, category: null })}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 text-foreground/75 hover:border-foreground/50",
                )}
              >
                {artist?.name ?? "All artists"}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-6 border-y border-foreground/10 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-x-7 gap-y-3">
          <FilterChip active={!category} count={total} onClick={() => update({ category: null })}>
            All works
          </FilterChip>
          {CATEGORIES.filter((c) => counts[c]).map((c) => (
            <FilterChip key={c} active={category === c} count={counts[c]} onClick={() => update({ category: c })}>
              {CATEGORY_META[c].label}
            </FilterChip>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="gallery-search" className="sr-only">
              Search by title, category or artist
            </label>
            <Input
              id="gallery-search"
              type="search"
              placeholder={multiArtist ? "Search title, category or artist" : "Search title or category"}
              defaultValue={query}
              onChange={(e) => update({ q: e.target.value || null })}
              className="rounded-full border-foreground/15 bg-transparent pl-9"
            />
          </div>
          <div role="group" aria-label="View mode" className="flex shrink-0 overflow-hidden rounded-full border border-foreground/15">
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
        {selectedArtist ? ` by ${selectedArtist.name}` : ""}
        {category ? ` in ${CATEGORY_META[category].label}` : ""}
        {query ? ` matching “${query}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No artworks found"
          description="Try a different category or search term."
          action={
            <Button variant="outline" onClick={() => update({ category: null, q: null, artist: null })}>
              Clear filters
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <ArtworkCard key={a.id} artwork={a} priority={i < 3} artist={byId.get(a.artistId)} showArtist={multiArtist} />
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-8 sm:columns-2 lg:columns-3 [&>article]:break-inside-avoid">
          {filtered.map((a, i) => (
            <ArtworkCard
              key={a.id}
              artwork={a}
              layout="masonry"
              priority={i < 3}
              artist={byId.get(a.artistId)}
              showArtist={multiArtist}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "link-draw inline-flex items-baseline gap-1.5 font-serif text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
        active ? "text-foreground" : "text-foreground/55 hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && <sup className="font-sans text-[0.65rem] tabular-nums text-muted-foreground">{count}</sup>}
    </button>
  );
}
