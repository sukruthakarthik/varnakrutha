"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requireAdminAction, requirePlatformAdminAction, type AdminContext } from "@/lib/auth";
import { RepositoryError } from "@/services/types";
import { artistProfileSchema, type ArtistProfileFormValues } from "./schemas";

const idSchema = z.string().uuid();

export type SaveProfileResult = ActionResult<{ message: string }>;

function parseProfile(values: ArtistProfileFormValues) {
  const parsed = artistProfileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Invalid profile details",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  return { ok: true as const, data: parsed.data };
}

/** Publishes the profile, approves the artist if this is their first approval, and clears any pending submission. */
async function publish(admin: AdminContext, artistId: string, values: ArtistProfileFormValues): Promise<SaveProfileResult> {
  const parsed = parseProfile(values);
  if (!parsed.ok) return parsed;
  await admin.dataSource.artists.updateProfile(artistId, parsed.data);
  await admin.dataSource.artists.approve(artistId);
  await admin.dataSource.profileReviews.delete(artistId);
  revalidatePath("/", "layout");
  return { ok: true, data: { message: "Profile published" } };
}

/** Platform admins publish their own profile directly; other artists submit it for review. */
export async function updateArtistProfile(values: ArtistProfileFormValues): Promise<SaveProfileResult> {
  try {
    const admin = await requireAdminAction();
    if (admin.isPlatformAdmin) return await publish(admin, admin.artist.id, values);

    const parsed = parseProfile(values);
    if (!parsed.ok) return parsed;
    await admin.dataSource.profileReviews.submit(admin.artist.id, parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true, data: { message: "Submitted for review. It will go live once approved." } };
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

// ─── Review (platform admins) ───────────────────────────────────────

/** Publishes a submitted profile, including any edits the reviewer made. */
export async function approveArtistProfile(
  artistId: string,
  values: ArtistProfileFormValues,
): Promise<SaveProfileResult> {
  try {
    const admin = await requirePlatformAdminAction();
    return await publish(admin, idSchema.parse(artistId), values);
  } catch (error) {
    return actionError(error);
  }
}

export async function discardArtistProfile(artistId: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    await admin.dataSource.profileReviews.delete(idSchema.parse(artistId));
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/** Lets a reviewer replace the photo in an artist's submission; stored in that artist's folder. */
export async function uploadArtistProfileImage(
  artistId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requirePlatformAdminAction();
    const artist = await admin.dataSource.artists.getById(idSchema.parse(artistId));
    if (!artist) throw new RepositoryError("Artist not found", "not_found");
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file provided" };
    const url = await admin.dataSource.storage.uploadProfileImage({ artistSlug: artist.slug, file });
    return { ok: true, data: { url } };
  } catch (error) {
    return actionError(error, "Upload failed");
  }
}
