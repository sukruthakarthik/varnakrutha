import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/admin/components/login-form";
import { getAdmin } from "@/lib/auth";
import { isSupabase } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 rounded-sm border border-border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-serif text-2xl">
            Art By <span className="text-primary">Sukrutha</span>
          </Link>
          <h1 className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Admin sign in
          </h1>
        </div>
        <LoginForm withEmail={isSupabase} />
      </div>
    </main>
  );
}
