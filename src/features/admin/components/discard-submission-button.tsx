"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { discardArtistProfile } from "@/features/artists/actions";
import { ConfirmDialog } from "./confirm-dialog";

export function DiscardSubmissionButton({ artistId, artistName }: { artistId: string; artistName: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" className="w-full text-destructive">
          <Trash2 aria-hidden /> Discard submission
        </Button>
      }
      title="Discard this submission?"
      description={`${artistName}'s live profile stays as it is. They can submit changes again from their Profile page.`}
      confirmLabel="Discard"
      onConfirm={async () => {
        const res = await discardArtistProfile(artistId);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Submission discarded");
        router.push("/admin/reviews");
        router.refresh();
      }}
    />
  );
}
