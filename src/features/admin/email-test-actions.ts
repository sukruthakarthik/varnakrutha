"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { runEmailTest, type EmailTestReport } from "@/services/accounts";

const emailSchema = z.string().trim().toLowerCase().email().max(200);

export async function sendEmailTest(email: string): Promise<ActionResult<EmailTestReport>> {
  try {
    await requirePlatformAdminAction();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return { ok: false, error: "Please enter a valid email" };
    return { ok: true, data: await runEmailTest(parsed.data) };
  } catch (error) {
    // Admins only, and this page exists to debug: show the real reason.
    console.error(error);
    return { ok: false, error: error instanceof Error ? error.message : "The test failed." };
  }
}
