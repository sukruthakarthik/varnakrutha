import Link from "next/link";
import { Clock, ExternalLink, EyeOff } from "lucide-react";
import { ProfileForm } from "@/features/admin/components/profile-form";
import { updateArtistProfile, uploadProfileImage } from "@/features/artists/actions";
import { requireAdminPage } from "@/lib/auth";
import { formatDate } from "@/utils/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { artist, dataSource, isPlatformAdmin } = await requireAdminPage();
  // Continue from a pending submission so the artist sees what they last sent.
  const pending = isPlatformAdmin ? null : await dataSource.profileReviews.get(artist.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Profile</h1>
        {artist.approvedAt && (
          <Link href="/about" target="_blank" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            View About page <ExternalLink className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {!artist.approvedAt && (
        <Notice icon={<EyeOff className="size-5" aria-hidden />}>
          Your profile isn&apos;t public yet. It will appear on the site once it has been reviewed and approved.
        </Notice>
      )}
      {pending && (
        <Notice icon={<Clock className="size-5" aria-hidden />}>
          Changes you submitted on {formatDate(pending.submittedAt)} are waiting for approval. Your public page shows the
          last approved version until then. Saving again replaces that submission.
        </Notice>
      )}

      <ProfileForm
        profile={pending?.profile ?? artist}
        save={updateArtistProfile}
        upload={uploadProfileImage}
        submitLabel={isPlatformAdmin ? "Save profile" : "Submit for review"}
        note={isPlatformAdmin ? undefined : "Changes are reviewed before they appear on your public page."}
      />
    </div>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {icon}
      <p>{children}</p>
    </div>
  );
}
