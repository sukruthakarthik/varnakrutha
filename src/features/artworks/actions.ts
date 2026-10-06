"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requireAdminAction } from "@/lib/auth";
import { AVAILABILITY, CATEGORIES, type Artwork, type Availability } from "@/types";
import { artworkInputSchema, type ArtworkFormValues } from "./schemas";

const idSchema = z.string().uuid();
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

function revalidatePublic() {
  revalidatePath("/", "layout");
}

async function assertOwnership(id: string) {
  const admin = await requireAdminAction();
  const artwork = await admin.dataSource.artworks.getById(idSchema.parse(id));
  if (!artwork || artwork.artistId !== admin.artist.id) throw new Error("Artwork not found");
  return { admin, artwork };
}

export async function listAdminArtworks(): Promise<Artwork[]> {
  const admin = await requireAdminAction();
  return admin.dataSource.artworks.list({ artistId: admin.artist.id });
}

export async function createArtwork(values: ArtworkFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdminAction();
    const parsed = artworkInputSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: "Invalid artwork details", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const artwork = await admin.dataSource.artworks.create(admin.artist.id, parsed.data);
    revalidatePublic();
    return { ok: true, data: { id: artwork.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateArtwork(
  id: string,
  values: ArtworkFormValues,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { admin } = await assertOwnership(id);
    const parsed = artworkInputSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: "Invalid artwork details", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await admin.dataSource.artworks.update(id, parsed.data);
    revalidatePublic();
    return { ok: true, data: { id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function setArtworkAvailability(
  id: string,
  availability: Availability,
): Promise<ActionResult> {
  try {
    const { admin } = await assertOwnership(id);
    await admin.dataSource.artworks.setAvailability(id, z.enum(AVAILABILITY).parse(availability));
    revalidatePublic();
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteArtwork(id: string): Promise<ActionResult> {
  try {
    const { admin } = await assertOwnership(id);
    await admin.dataSource.artworks.delete(id);
    revalidatePublic();
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadArtworkImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requireAdminAction();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file provided" };
    const category = z.enum(CATEGORIES).parse(formData.get("category"));
    const artworkSlug = slugSchema.parse(formData.get("slug"));
    const url = await admin.dataSource.storage.uploadArtworkImage({
      artistSlug: admin.artist.slug,
      category,
      artworkSlug,
      file,
    });
    return { ok: true, data: { url } };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Set a valid title/slug and category first" };
    return actionError(error, "Upload failed");
  }
}
