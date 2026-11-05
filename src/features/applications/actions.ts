"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getPublicDataSource } from "@/services";
import { provisionArtistAccount, sendSetPasswordEmail, type ProvisionedArtist } from "@/services/accounts";
import { checkApplicantEmail } from "@/services/applicant-check";
import { formatDate } from "@/utils/format";
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
    // One application at a time per email, and none for existing artists. Checked after the rate limit,
    // so the form can't be used to probe many addresses quickly.
    const standing = await checkApplicantEmail(input.email);
    if (standing?.kind === "account") {
      return {
        ok: false,
        error:
          "An artist account already exists for this email, so there's no need to apply again. Sign in at /admin/login, or use “Forgot your password?” there to set a new one. Please check the email address if this isn't you.",
        fieldErrors: { email: ["An artist account already exists for this email"] },
      };
    }
    if (standing?.kind === "pending") {
      return {
        ok: false,
        error: `You already applied with this email on ${formatDate(standing.since)}, and it's still being reviewed. You'll hear back by email, so there's no need to apply again. Please check the email address if this isn't you.`,
        fieldErrors: { email: ["An application with this email is already being reviewed"] },
      };
    }

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
    // Spam is set and cleared with markApplicationSpam / markApplicationNotSpam, which also manage the block list.
    if (update.status === "spam" || current.status === "spam") {
      return { ok: false, error: "Use Mark as spam or Not spam for this." };
    }
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
    if (application.status === "spam") return { ok: false, error: "This application is marked as spam. Click Not spam first." };

    const provisioned = await provisionArtistAccount(application);
    await admin.dataSource.applications.markAccepted(application.id, provisioned.artist.id);
    revalidatePath("/admin", "layout");
    return { ok: true, data: provisioned };
  } catch (error) {
    return actionError(error, "Couldn't create the artist's account. Please try again.");
  }
}

/**
 * Emails an accepted applicant a fresh link to set their password, e.g. when the invitation never arrived
 * or has expired. The link signs them in at /admin/set-password; afterwards they sign in at /admin/login.
 */
export async function resendSetPasswordEmail(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const application = (await admin.dataSource.applications.list()).find((a) => a.id === z.string().uuid().parse(id));
    if (!application) return { ok: false, error: "Application not found" };
    if (!application.artistId) return { ok: false, error: "Accept the application first; that creates the account." };
    await sendSetPasswordEmail(application.email);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "Couldn't send the email. Please try again in a minute.");
  }
}

/**
 * Moves the application to Spam (kept, hidden, restorable) and blocks the email, so anything else
 * they send is filed as spam automatically. Applicants who already have an artist account can't be
 * marked here; unpublish the artist instead (docs/MODERATION.md).
 */
export async function markApplicationSpam(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const application = (await admin.dataSource.applications.list()).find((a) => a.id === z.string().uuid().parse(id));
    if (!application) return { ok: false, error: "Application not found" };
    if (application.artistId) {
      return { ok: false, error: "This applicant already has an artist account. Unpublish the artist instead (see the moderation guide)." };
    }
    await admin.dataSource.applications.update(application.id, { status: "spam", adminNote: application.adminNote });
    await admin.dataSource.blocklist.block(application.email, `Spam application from ${application.name}`);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/** Restores a spam application to New and unblocks the email. */
export async function markApplicationNotSpam(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const application = (await admin.dataSource.applications.list()).find((a) => a.id === z.string().uuid().parse(id));
    if (!application) return { ok: false, error: "Application not found" };
    await admin.dataSource.applications.update(application.id, { status: "new", adminNote: application.adminNote });
    await admin.dataSource.blocklist.unblock(application.email);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Permanent; only for spam (e.g. clearing out old spam) and declined applications (the Privacy Policy
 * promises those are deleted once answered). Everything else should be declined or marked as spam first.
 */
export async function deleteApplication(id: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const application = (await admin.dataSource.applications.list()).find((a) => a.id === z.string().uuid().parse(id));
    if (!application) return { ok: false, error: "Application not found" };
    if (application.status !== "spam" && application.status !== "declined") {
      return { ok: false, error: "Only spam or declined applications can be deleted. Decline it or mark it as spam first." };
    }
    await admin.dataSource.applications.delete(application.id);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
