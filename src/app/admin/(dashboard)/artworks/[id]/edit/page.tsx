import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { ArtworkForm } from "@/features/admin/components/artwork-form";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Edit artwork" };

type Props = { params: Promise<{ id: string }> };

export default async function EditArtworkPage({ params }: Props) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { artist, dataSource } = await requireAdminPage();
  const artwork = await dataSource.artworks.getById(id);
  if (!artwork || artwork.artistId !== artist.id) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Edit “{artwork.title}”</h1>
        <Link href={`/artworks/${artwork.slug}`} target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          View live <ExternalLink className="size-4" aria-hidden />
        </Link>
      </div>
      <ArtworkForm artwork={artwork} />
    </div>
  );
}
