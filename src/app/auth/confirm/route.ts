import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabase } from "@/lib/env";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email", "email_change"];

/**
 * Landing point for links in Supabase emails (artist invitations and password resets).
 * Verifies the link, which signs the user in, then sends them on, usually to choose a password.
 *
 * The email templates must point here; see docs/DEPLOYMENT.md ("Artist account emails").
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next");
  // Same-site paths only, so the link can't be used to redirect somewhere else.
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin/set-password";
  const failed = NextResponse.redirect(new URL("/admin/login?error=link", request.url));
  if (!isSupabase) return failed;

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();

  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  let error: unknown = "missing token";
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }
  return error ? failed : NextResponse.redirect(new URL(next, request.url));
}
