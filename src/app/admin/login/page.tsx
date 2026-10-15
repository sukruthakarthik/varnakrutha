import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/admin/components/auth-card";
import { LoginForm } from "@/features/admin/components/login-form";
import { getAdmin } from "@/lib/auth";
import { isSupabase } from "@/lib/env";

export const metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <AuthCard title="Sign in">
      {error === "link" && (
        <p role="alert" className="rounded-sm bg-secondary/60 px-3 py-2 text-sm">
          That link has expired or was already used. Request a new one below.
        </p>
      )}
      <LoginForm mode={isSupabase ? "email" : "mock"} />
      {isSupabase && (
        <p className="text-center text-sm">
          <Link href="/admin/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            Forgot your password, or invitation expired?
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
