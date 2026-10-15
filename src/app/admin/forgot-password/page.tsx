import { notFound } from "next/navigation";
import { AuthCard } from "@/features/admin/components/auth-card";
import { ForgotPasswordForm } from "@/features/admin/components/password-forms";
import { isSupabase } from "@/lib/env";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  if (!isSupabase) notFound();
  return (
    <AuthCard title="Reset password">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
