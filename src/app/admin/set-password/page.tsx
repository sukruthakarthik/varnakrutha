import { notFound, redirect } from "next/navigation";
import { AuthCard } from "@/features/admin/components/auth-card";
import { SetPasswordForm } from "@/features/admin/components/password-forms";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { isSupabase } from "@/lib/env";

export const metadata = { title: "Choose a password" };

/** Reached from an invitation or reset email (after /auth/confirm signs the user in), or from "Change password". */
export default async function SetPasswordPage() {
  if (!isSupabase) notFound();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/admin/login?error=link");

  return (
    <AuthCard title="Choose a password">
      <p className="text-center text-sm text-muted-foreground">
        For <span className="text-foreground">{user.email}</span>. You&apos;ll use it to sign in from now on, and can
        change it any time from the admin menu.
      </p>
      <SetPasswordForm minLength={MIN_PASSWORD_LENGTH} />
    </AuthCard>
  );
}
