import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkTable } from "@/features/admin/components/artwork-table";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Artworks" };

export default async function AdminArtworksPage() {
  const { artist, dataSource } = await requireAdminPage();
  const artworks = await dataSource.artworks.list({ artistId: artist.id });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Artworks</h1>
          <p className="text-sm text-muted-foreground">Add, edit and update availability of your works.</p>
        </div>
        <Button asChild>
          <Link href="/admin/artworks/new">
            <Plus aria-hidden /> Add artwork
          </Link>
        </Button>
      </div>
      <ArtworkTable initialData={artworks} />
    </div>
  );
}
