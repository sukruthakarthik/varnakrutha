"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { getPublicDataSource } from "@/services";
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

  const { company, ...input } = parsed.data;
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
    await admin.dataSource.applications.update(id, update);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Notes must be under 2,000 characters" };
    return actionError(error);
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
