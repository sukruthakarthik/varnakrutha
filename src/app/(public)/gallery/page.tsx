import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionHeading } from "@/components/common/section-heading";
import { defaultOpenGraph } from "@/lib/site";
import { GalleryExplorer } from "@/features/artworks/components/gallery-explorer";
import { getCurrentArtist, getPublicDataSource } from "@/services";
import GalleryLoading from "./loading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse original heritage paintings, temple art, landscapes, watercolors, acrylics and sketches by Sukrutha Karthik.",
  alternates: { canonical: "/gallery" },
  openGraph: { ...defaultOpenGraph, url: "/gallery", title: "Gallery | Art By Sukrutha" },
};

export default async function GalleryPage() {
  const artist = await getCurrentArtist();
  const artworks = await (await getPublicDataSource()).artworks.list({ artistId: artist.id });

  return (
    <div className="container-page space-y-12 py-16 md:py-20">
      <SectionHeading
        as="h1"
        eyebrow="The collection"
        title="Gallery"
        description="Original paintings and studies — filter by category or search for a title."
      />
      <Suspense fallback={<GalleryLoading />}>
        <GalleryExplorer artworks={artworks} />
      </Suspense>
    </div>
  );
}
