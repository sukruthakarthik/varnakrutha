import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/auth";
import { formatDate } from "@/utils/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { artist, dataSource } = await requireAdminPage();
  const [artworks, inquiries] = await Promise.all([
    dataSource.artworks.list({ artistId: artist.id }),
    dataSource.inquiries.list(artist.id),
  ]);

  const stats = [
    { label: "Total artworks", value: artworks.length },
    { label: "Available", value: artworks.filter((a) => a.availability === "available").length },
    { label: "Reserved", value: artworks.filter((a) => a.availability === "reserved").length },
    { label: "Sold", value: artworks.filter((a) => a.availability === "sold").length },
    { label: "New inquiries", value: inquiries.filter((i) => i.status === "new").length },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {artist.name.split(" ")[0]}.</p>
        </div>
        <Button asChild>
          <Link href="/admin/artworks/new">
            <Plus aria-hidden /> Add artwork
          </Link>
        </Button>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</dt>
            <dd className="mt-2 font-serif text-4xl lining-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent inquiries</CardTitle>
            <CardDescription>The latest messages from visitors.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inquiries">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {inquiries.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No inquiries yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {inquiries.slice(0, 5).map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {i.name} <span className="font-normal text-muted-foreground">· {i.subject}</span>
                    </p>
                    {i.artwork && <p className="text-xs text-muted-foreground">Re: {i.artwork.title}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {i.status === "new" && <Badge>New</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDate(i.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
