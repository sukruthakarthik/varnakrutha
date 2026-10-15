"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getSessionSecret,
  type SessionClaims,
} from "@/lib/auth/session";
import { getAdmin } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { isSupabase } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { absoluteUrl } from "@/lib/site";
import { verifyMockArtistLogin } from "@/services/accounts";

export interface SignInState {
  error: string | null;
}

export interface FormState {
  error: string | null;
  message?: string | null;
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  password: z.string().min(1).max(200),
});

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function startMockSession(secret: string, claims: SessionClaims) {
  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(secret, claims), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (!rateLimit(`login:${await getClientIp()}`, 5, 15 * 60 * 1000)) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter valid credentials." };
  const { email, password } = parsed.data;

  if (!isSupabase) {
    const secret = getSessionSecret();
    if (!secret) return { error: "Login is not configured. Set ADMIN_SESSION_SECRET (32+ chars)." };

    // Mock mode: an email means an artist account; no email means the site admin's password.
    if (email) {
      const artistId = await verifyMockArtistLogin(email, password);
      if (!artistId) return { error: "Invalid email or password." };
      await startMockSession(secret, { role: "artist", artistId });
      redirect("/admin");
    }

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || expected.length < 8) {
      return { error: "Admin login is not configured. Set ADMIN_PASSWORD (8+ chars)." };
    }
    if (!safeEqual(password, expected)) return { error: "Incorrect password." };
    await startMockSession(secret, { role: "admin", artistId: null });
    redirect("/admin");
  }

  if (!email) return { error: "Please enter your email." };
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  if (!(await getAdmin())) {
    await supabase.auth.signOut();
    return { error: "This account isn't linked to an artist yet." };
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  if (isSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    await (await createServerSupabaseClient()).auth.signOut();
  } else {
    (await cookies()).delete(ADMIN_COOKIE);
  }
  redirect("/admin/login");
}

/** Emails a link to choose a new password. Always reports success so it can't reveal who has an account. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabase) return { error: "Password reset is only available with Supabase." };
  if (!rateLimit(`reset:${await getClientIp()}`, 3, 15 * 60 * 1000)) {
    return { error: "Too many requests. Please wait 15 minutes and try again." };
  }
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(formData.get("email"));
  if (!email.success) return { error: "Please enter a valid email." };

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: absoluteUrl("/auth/confirm?next=/admin/set-password"),
  });
  if (error) console.error("[password-reset]", error.message);
  return { error: null, message: "If that email has an account, a link to set a new password is on its way." };
}

const newPasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match", path: ["confirm"] });

/** Sets the signed-in user's password (after following an invite or reset link). */
export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabase) return { error: "Passwords are managed in .env.local in mock mode." };
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the password." };

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Your link may have expired. Request a new one from the sign-in page." };
  redirect("/admin");
}
