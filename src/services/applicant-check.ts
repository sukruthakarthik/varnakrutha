import "server-only";
import { isSupabase } from "@/lib/env";
import { getMockDb } from "@/services/mock/store";
import type { ApplicationStatus } from "@/types";

/**
 * Why an email can't be used for a new application:
 * "account": it already signs in as an artist here.
 * "pending": it already has an application waiting for a decision (submitted `since`).
 * Declined applicants may apply again.
 */
export type ApplicantEmailStanding = { kind: "account" } | { kind: "pending"; since: string } | null;

const PENDING: ApplicationStatus[] = ["new", "shortlisted"];

export async function checkApplicantEmail(rawEmail: string): Promise<ApplicantEmailStanding> {
  const email = rawEmail.trim().toLowerCase();
  return isSupabase ? checkWithSupabase(email) : checkMock(email);
}

async function checkMock(email: string): Promise<ApplicantEmailStanding> {
  const db = await getMockDb();
  if (db.accounts.some((a) => a.email === email)) return { kind: "account" };
  return earliestPending(db.applications.filter((a) => a.email.trim().toLowerCase() === email));
}

async function checkWithSupabase(email: string): Promise<ApplicantEmailStanding> {
  // Applicants can't read applications (RLS), so this check uses the server-only service-role client.
  // Without the key it lets the application through rather than blocking genuine applicants.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[applications] SUPABASE_SERVICE_ROLE_KEY is not set; skipping the duplicate-email check.");
    return null;
  }
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();

  // Emails were stored as typed before they were lower-cased on save, so match case-insensitively.
  // ilike treats % and _ as wildcards; escape them so only this exact address matches.
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await admin
    .from("artist_applications")
    .select("email, status, artist_id, created_at")
    .ilike("email", pattern);
  if (error) {
    console.error("[applications] duplicate-email check failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as { email: string; status: ApplicationStatus; artist_id: string | null; created_at: string }[];
  if (rows.some((r) => r.artist_id)) return { kind: "account" };
  return earliestPending(rows.map((r) => ({ status: r.status, createdAt: r.created_at })));
}

function earliestPending(applications: { status: ApplicationStatus; createdAt: string }[]): ApplicantEmailStanding {
  const pending = applications.filter((a) => PENDING.includes(a.status)).map((a) => a.createdAt).sort();
  return pending[0] ? { kind: "pending", since: pending[0] } : null;
}
