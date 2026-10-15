import { ArtworkForm } from "@/features/admin/components/artwork-form";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Add artwork" };

export default async function NewArtworkPage() {
  const { artist } = await requireAdminPage();
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Add artwork</h1>
      <ArtworkForm artistSlug={artist.slug} />
    </div>
  );
}
