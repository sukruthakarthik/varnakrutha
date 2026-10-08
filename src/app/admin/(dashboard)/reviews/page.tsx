import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { changedProfileFields } from "@/features/artists/review";
import { requirePlatformAdminPage } from "@/lib/auth";
import { formatDate } from "@/utils/format";

export const metadata = { title: "Profile reviews" };

export default async function ReviewsPage() {
  const { dataSource } = await requirePlatformAdminPage();
  const reviews = await dataSource.profileReviews.list();
  const artists = await Promise.all(reviews.map((r) => dataSource.artists.getById(r.artistId)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Profile reviews</h1>
        <p className="text-sm text-muted-foreground">
          Profile changes from artists. Check each one, edit if needed, then approve to publish it.
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Nothing waiting for review.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review, i) => {
            const artist = artists[i];
            const changes = artist ? changedProfileFields(artist, review.profile) : [];
            return (
              <li key={review.artistId}>
                <Link href={`/admin/reviews/${review.artistId}`} className="block rounded-sm border border-border bg-background p-4 transition-colors hover:bg-secondary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.artistName || "Unknown artist"}</span>
                      {artist && !artist.approvedAt && <Badge variant="warning">New artist</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">Submitted {formatDate(review.submittedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {changes.length > 0 ? `Changed: ${changes.map((c) => c.label).join(", ")}` : "No changes from the live profile"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
