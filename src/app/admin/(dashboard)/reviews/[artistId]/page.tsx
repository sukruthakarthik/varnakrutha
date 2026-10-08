import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscardSubmissionButton } from "@/features/admin/components/discard-submission-button";
import { ProfileForm } from "@/features/admin/components/profile-form";
import { approveArtistProfile, uploadArtistProfileImage } from "@/features/artists/actions";
import { changedProfileFields } from "@/features/artists/review";
import { requirePlatformAdminPage } from "@/lib/auth";
import { formatDate } from "@/utils/format";

export const metadata = { title: "Review profile" };

type Props = { params: Promise<{ artistId: string }> };

export default async function ReviewProfilePage({ params }: Props) {
  const { artistId } = await params;
  if (!z.string().uuid().safeParse(artistId).success) notFound();

  const { dataSource } = await requirePlatformAdminPage();
  const [artist, review] = await Promise.all([
    dataSource.artists.getById(artistId),
    dataSource.profileReviews.get(artistId),
  ]);
  if (!artist || !review) notFound();

  const changes = changedProfileFields(artist, review.profile);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/reviews" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> All reviews
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl">Review “{artist.name}”</h1>
          {!artist.approvedAt && <Badge variant="warning">New artist</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {formatDate(review.submittedAt)}. The form shows the submitted profile; edit anything that needs
          fixing, then approve to publish it.
        </p>
      </div>

      {changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What changed</CardTitle>
            <CardDescription>
              {artist.approvedAt ? "Currently live, for comparison." : "Not yet public; these are the sample defaults it started with."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {changes.map((c) => (
                <div key={c.label} className="space-y-1">
                  <dt className="text-sm font-medium">{c.label}</dt>
                  <dd className="line-clamp-6 whitespace-pre-line text-sm text-muted-foreground">{c.live}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <ProfileForm
        profile={review.profile}
        save={approveArtistProfile.bind(null, artist.id)}
        upload={uploadArtistProfileImage.bind(null, artist.id)}
        submitLabel="Approve & publish"
        allowUnchanged
        redirectTo="/admin/reviews"
        actions={<DiscardSubmissionButton artistId={artist.id} artistName={artist.name} />}
      />
    </div>
  );
}
