import { EmailTestForm } from "@/features/admin/components/email-test-form";
import { requirePlatformAdminPage } from "@/lib/auth";
import { isSupabase } from "@/lib/env";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "Test" };
export const dynamic = "force-dynamic";

/** Debugging tools for the live site, one card per test; admins only (artists get a 404). */
export default async function TestPage() {
  await requirePlatformAdminPage();
  const checks = [
    { label: "Data source", value: isSupabase ? "Supabase" : "Mock: no emails are sent" },
    { label: "Site address in email links", value: siteConfig.url },
    { label: "Service role key", value: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing: Accept can't work" },
    { label: "Running version", value: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "Unknown" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Test</h1>
        <p className="text-sm text-muted-foreground">Debugging tools for this site. Only admins can see this page.</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-sm border border-border bg-background p-4 text-sm">
        {checks.map((c) => (
          <div key={c.label} className="contents">
            <dt className="text-muted-foreground">{c.label}</dt>
            <dd className="break-words">{c.value}</dd>
          </div>
        ))}
      </dl>
      <EmailTestForm />
    </div>
  );
}
