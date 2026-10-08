import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProfileForm } from "@/features/admin/components/profile-form";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { artist } = await requireAdminPage();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Profile</h1>
        <Link href="/about" target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          View About page <ExternalLink className="size-4" aria-hidden />
        </Link>
      </div>
      <ProfileForm artist={artist} />
    </div>
  );
}
