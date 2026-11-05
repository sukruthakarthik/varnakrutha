import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AvailabilityBadge } from "@/features/artworks/components/availability-badge";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { requirePlatformAdminPage } from "@/lib/auth";
import { categoryLabels } from "@/lib/constants";
import { artistPath, artworkPath } from "@/lib/site";
import { cn } from "@/lib/utils";
import { formatDate, formatPrice } from "@/utils/format";

export const metadata = { title: "All artworks" };

type Props = { searchParams: Promise<{ artist?: string | string[] }> };

/**
 * Every artist's artworks for platform admins, read-only. Artists own their listings and prices
 * ("independent admin access"), so there is deliberately no edit, delete or availability control here.
 */
export default async function AllArtworksPage({ searchParams }: Props) {
  const { dataSource } = await requirePlatformAdminPage();
  const { artist: artistParam } = await searchParams;
  const [artists, allArtworks] = await Promise.all([dataSource.artists.list(), dataSource.artworks.list()]);

  const artistById = new Map(artists.map((a) => [a.id, a]));
  const selected = typeof artistParam === "string" ? artists.find((a) => a.slug === artistParam) ?? null : null;
  const artworks = selected ? allArtworks.filter((a) => a.artistId === selected.id) : allArtworks;
  const countFor = (artistId: string) => allArtworks.filter((a) => a.artistId === artistId).length;

  const stats = [
    { label: "Artworks", value: artworks.length },
    { label: "Available", value: artworks.filter((a) => a.availability === "available").length },
    { label: "Reserved", value: artworks.filter((a) => a.availability === "reserved").length },
    { label: "Sold", value: artworks.filter((a) => a.availability === "sold").length },
    { label: "No price", value: artworks.filter((a) => a.price === null).length },
  ];

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-secondary",
      active ? "border-primary bg-secondary font-medium" : "border-border",
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">All artworks</h1>
        <p className="text-sm text-muted-foreground">
          Every artist&apos;s artworks, prices and availability. View only: each artist manages their own listings.
        </p>
      </div>

      <nav aria-label="Filter by artist" className="flex flex-wrap gap-2">
        <Link href="/admin/all-artworks" className={chip(!selected)} aria-current={!selected ? "page" : undefined}>
          All artists ({allArtworks.length})
        </Link>
        {artists.map((a) => (
          <Link
            key={a.id}
            href={`/admin/all-artworks?artist=${encodeURIComponent(a.slug)}`}
            className={chip(selected?.id === a.id)}
            aria-current={selected?.id === a.id ? "page" : undefined}
          >
            {a.name} ({countFor(a.id)})
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-2xl tabular-nums">{s.value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      {artworks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No artworks yet.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th scope="col" className="p-3 font-medium">Artwork</th>
                <th scope="col" className="p-3 font-medium">Artist</th>
                <th scope="col" className="p-3 text-right font-medium">Price</th>
                <th scope="col" className="p-3 text-right font-medium">Shipping</th>
                <th scope="col" className="p-3 font-medium">Availability</th>
                <th scope="col" className="p-3 font-medium">Added</th>
                <th scope="col" className="p-3 font-medium"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artworks.map((a) => {
                const artist = artistById.get(a.artistId);
                // Unapproved artists' pages aren't public yet, so there is nothing to open.
                const live = Boolean(artist?.approvedAt);
                return (
                  <tr key={a.id} className="align-middle">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-secondary">
                          <ArtworkImage src={a.coverImage} alt="" sizes="56px" />
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium">
                            {a.title}
                            {a.featured && <Star className="size-3.5 fill-primary text-primary" aria-label="Featured" />}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[a.medium, categoryLabels(a.categories)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {artist ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {live ? (
                            <Link href={artistPath(artist.slug)} target="_blank" className="underline-offset-4 hover:underline">
                              {artist.name}
                            </Link>
                          ) : (
                            artist.name
                          )}
                          {!live && <Badge variant="warning">Not live</Badge>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatPrice(a.price) ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-3 text-right tabular-nums">
                      {a.shippingFee === null ? <span className="text-muted-foreground">Free</span> : formatPrice(a.shippingFee)}
                    </td>
                    <td className="p-3">
                      <AvailabilityBadge availability={a.availability} />
                    </td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{formatDate(a.createdAt)}</td>
                    <td className="p-3 text-right">
                      {live && artist && (
                        <Link
                          href={artworkPath(a.slug, artist.slug)}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          View <ExternalLink className="size-3.5" aria-hidden />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
