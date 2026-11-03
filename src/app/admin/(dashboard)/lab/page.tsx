import { LabManager } from "@/features/lab/components/lab-manager";
import { requirePlatformAdminPage } from "@/lib/auth";
import { isSupabase } from "@/lib/env";
import { listLabFiles, type LabFile } from "@/services/lab";

export const metadata = { title: "Lab" };
export const dynamic = "force-dynamic";

/** Private study resources, visible only to admins (artists get a 404). */
export default async function LabPage() {
  await requirePlatformAdminPage();
  let files: LabFile[] = [];
  let loadError: string | null = null;
  try {
    files = await listLabFiles();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Couldn't load the Lab.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Lab</h1>
        <p className="text-sm text-muted-foreground">
          Private study resources. Only admins can see these files; they&apos;re never shown on the website.
        </p>
      </div>
      {loadError && (
        <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
          {isSupabase && " If this is the first time, run supabase/migrations/20261103000000_lab_storage.sql in Supabase."}
        </p>
      )}
      <LabManager files={files} storage={isSupabase ? "supabase" : "local"} />
    </div>
  );
}
