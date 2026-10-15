"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getPublicDataSource } from "@/services";
import { provisionArtistAccount, type ProvisionedArtist } from "@/services/accounts";
import { applicationInputSchema, applicationStatusSchema, type ApplicationFormValues } from "./schemas";

export async function submitApplication(values: ApplicationFormValues): Promise<ActionResult> {
  const parsed = applicationInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // The schema already requires originalWork to be true; it isn't stored.
  const { company, originalWork, ...input } = parsed.data;
  if (!originalWork) return { ok: false, error: "Please confirm the work you share is your own" };
  // Honeypot tripped: report success without storing anything.
  if (company) return { ok: true, data: undefined };

  if (!rateLimit(`application:${await getClientIp()}`, 3, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many applications. Please try again later." };
  }

  try {
    await (await getPublicDataSource()).applications.create(input);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "We couldn't send your application. Please try again later.");
  }
}

// ─── Admin (platform admins) ────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().uuid(),
  status: applicationStatusSchema,
  adminNote: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export async function updateApplication(values: z.input<typeof updateSchema>): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const { id, ...update } = updateSchema.parse(values);
    const current = (await admin.dataSource.applications.list()).find((a) => a.id === id);
    if (!current) return { ok: false, error: "Application not found" };
    // Acceptance creates an account, so it only happens through acceptApplication, and can't be undone here.
    if (update.status === "accepted" && current.status !== "accepted") {
      return { ok: false, error: "Use Accept to create the artist's account." };
    }
    if (current.status === "accepted" && update.status !== "accepted") {
      return { ok: false, error: "This artist already has an account, so the application stays accepted." };
    }
    await admin.dataSource.applications.update(id, update);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Notes must be under 2,000 characters" };
    return actionError(error);
  }
}

/** Accepts the application: creates the artist and their login (artist role), then marks it accepted. */
export async function acceptApplication(id: string): Promise<ActionResult<ProvisionedArtist>> {
  try {
    const admin = await requirePlatformAdminAction();
    const applicationId = z.string().uuid().parse(id);
    const application = (await admin.dataSource.applications.list()).find((a) => a.id === applicationId);
    if (!application) return { ok: false, error: "Application not found" };
    if (application.artistId) return { ok: false, error: "This application already has an artist account." };

    const provisioned = await provisionArtistAccount(application);
    await admin.dataSource.applications.markAccepted(application.id, provisioned.artist.id);
    revalidatePath("/admin", "layout");
    return { ok: true, data: provisioned };
  } catch (error) {
    return actionError(error, "Couldn't create the artist's account. Please try again.");
  }
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    await admin.dataSource.applications.delete(z.string().uuid().parse(id));
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
