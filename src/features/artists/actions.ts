"use server";

import { revalidatePath } from "next/cache";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requireAdminAction } from "@/lib/auth";
import { artistProfileSchema, type ArtistProfileFormValues } from "./schemas";

export async function updateArtistProfile(values: ArtistProfileFormValues): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const parsed = artistProfileSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: "Invalid profile details", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    await admin.dataSource.artists.updateProfile(admin.artist.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadProfileImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requireAdminAction();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file provided" };
    const url = await admin.dataSource.storage.uploadProfileImage({ artistSlug: admin.artist.slug, file });
    return { ok: true, data: { url } };
  } catch (error) {
    return actionError(error, "Upload failed");
  }
}
