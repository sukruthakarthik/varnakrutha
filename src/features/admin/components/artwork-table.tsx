"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { deleteArtwork, setArtworkAvailability } from "@/features/artworks/actions";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { AVAILABILITY_META, CATEGORY_META } from "@/lib/constants";
import { AVAILABILITY, type Artwork, type Availability } from "@/types";
import { formatPrice } from "@/utils/format";
import { adminKeys, useAdminArtworks } from "../hooks";
import { ConfirmDialog } from "./confirm-dialog";

export function ArtworkTable({ initialData }: { initialData: Artwork[] }) {
  const queryClient = useQueryClient();
  const { data: artworks } = useAdminArtworks(initialData);

  const availabilityMutation = useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: Availability }) => {
      const res = await setArtworkAvailability(id, availability);
      if (!res.ok) throw new Error(res.error);
    },
    onMutate: async ({ id, availability }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.artworks });
      const previous = queryClient.getQueryData<Artwork[]>(adminKeys.artworks);
      queryClient.setQueryData<Artwork[]>(adminKeys.artworks, (old) =>
        old?.map((a) => (a.id === id ? { ...a, availability } : a)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(adminKeys.artworks, context?.previous);
      toast.error(error.message);
    },
    onSuccess: (_d, { availability }) => toast.success(`Marked as ${AVAILABILITY_META[availability].label.toLowerCase()}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.artworks }),
  });

  async function handleDelete(artwork: Artwork) {
    const res = await deleteArtwork(artwork.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Deleted “${artwork.title}”`);
    await queryClient.invalidateQueries({ queryKey: adminKeys.artworks });
  }

  if (artworks.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No artworks yet"
        description="Add your first artwork to start building the gallery."
        action={
          <Button asChild>
            <Link href="/admin/artworks/new">Add artwork</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-background">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Artwork</th>
            <th scope="col" className="px-4 py-3 font-medium">Category</th>
            <th scope="col" className="px-4 py-3 font-medium">Price</th>
            <th scope="col" className="px-4 py-3 font-medium">Availability</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {artworks.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-secondary">
                    <ArtworkImage src={a.coverImage} alt="" sizes="56px" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      {a.title}
                      {a.featured && <Star className="size-3.5 shrink-0 fill-primary text-primary" aria-label="Featured" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">/{a.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{CATEGORY_META[a.category].label}</td>
              <td className="px-4 py-3">{formatPrice(a.price) ?? "—"}</td>
              <td className="px-4 py-3">
                <label className="sr-only" htmlFor={`availability-${a.id}`}>
                  Availability for {a.title}
                </label>
                <NativeSelect
                  id={`availability-${a.id}`}
                  value={a.availability}
                  onChange={(e) => availabilityMutation.mutate({ id: a.id, availability: e.target.value as Availability })}
                  className="h-9 w-32"
                >
                  {AVAILABILITY.map((v) => (
                    <option key={v} value={v}>
                      {AVAILABILITY_META[v].label}
                    </option>
                  ))}
                </NativeSelect>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" aria-label={`Edit ${a.title}`}>
                    <Link href={`/admin/artworks/${a.id}/edit`}>
                      <Pencil />
                    </Link>
                  </Button>
                  <ConfirmDialog
                    title="Delete artwork?"
                    description={`“${a.title}” will be permanently removed from the gallery. Related inquiries are kept.`}
                    onConfirm={() => handleDelete(a)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Delete ${a.title}`} className="text-destructive hover:text-destructive">
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
