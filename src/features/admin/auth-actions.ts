"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, createSessionToken, getSessionSecret } from "@/lib/auth/session";
import { getAdmin } from "@/lib/auth";
import { isSupabase } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export interface SignInState {
  error: string | null;
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(200).optional(),
  password: z.string().min(1).max(200),
});

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
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
    const expected = process.env.ADMIN_PASSWORD;
    const secret = getSessionSecret();
    if (!expected || expected.length < 8 || !secret) {
      return {
        error: "Admin login is not configured. Set ADMIN_PASSWORD (8+ chars) and ADMIN_SESSION_SECRET (32+ chars).",
      };
    }
    if (!safeEqual(password, expected)) return { error: "Incorrect password." };

    (await cookies()).set(ADMIN_COOKIE, await createSessionToken(secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    redirect("/admin");
  }

  if (!email) return { error: "Please enter your email." };
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  if (!(await getAdmin())) {
    await supabase.auth.signOut();
    return { error: "This account does not have admin access." };
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
