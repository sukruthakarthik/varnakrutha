import { ArtworkForm } from "@/features/admin/components/artwork-form";

export const metadata = { title: "Add artwork" };

export default function NewArtworkPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Add artwork</h1>
      <ArtworkForm />
    </div>
  );
}
