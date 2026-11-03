"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { deleteLabFile, LAB_MAX_UPLOAD_BYTES, uploadLabFile } from "@/services/lab";

/**
 * Admin only. Puts the files in the subject's folder (created if new), e.g. an HTML page together with its
 * CSS, scripts and images so its relative links work in the viewer.
 */
export async function uploadLabResource(formData: FormData): Promise<ActionResult<{ count: number; folder: string }>> {
  try {
    await requirePlatformAdminAction();
    const subject = z.string().trim().max(60).parse(formData.get("subject") ?? "");
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { ok: false, error: "Choose at least one file to upload." };
    if (files.reduce((sum, f) => sum + f.size, 0) > LAB_MAX_UPLOAD_BYTES) {
      return { ok: false, error: "That's over 4 MB in total. Upload in smaller batches, or use the Supabase dashboard." };
    }
    let folder = "";
    for (const file of files) folder = (await uploadLabFile(subject, file)).subject;
    revalidatePath("/admin/lab");
    return { ok: true, data: { count: files.length, folder } };
  } catch (error) {
    return actionError(error, "Couldn't upload the file.");
  }
}

export async function deleteLabResource(path: string): Promise<ActionResult> {
  try {
    await requirePlatformAdminAction();
    await deleteLabFile(z.string().parse(path));
    revalidatePath("/admin/lab");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "Couldn't delete the file.");
  }
}
