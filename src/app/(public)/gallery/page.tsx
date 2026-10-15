import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionHeading } from "@/components/common/section-heading";
import { defaultOpenGraph, siteConfig } from "@/lib/site";
import { GalleryExplorer } from "@/features/artworks/components/gallery-explorer";
import { getPublishedArtists, getPublishedArtworks } from "@/services";
import GalleryLoading from "./loading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse original heritage paintings, temple art, landscapes, watercolors, acrylics and sketches by Sukrutha Karthik and featured artists.",
  alternates: { canonical: "/gallery" },
  openGraph: { ...defaultOpenGraph, url: "/gallery", title: `Gallery | ${siteConfig.name}` },
};

export default async function GalleryPage() {
  // Every approved artist's work; unapproved artists stay hidden until an admin approves their profile.
  const [artists, artworks] = await Promise.all([getPublishedArtists(), getPublishedArtworks()]);

  return (
    <div className="container-page space-y-12 py-16 md:py-20">
      <SectionHeading
        as="h1"
        eyebrow="The collection"
        title="Gallery"
        description={
          artists.length > 1
            ? "Original paintings and studies from every artist on the site. Filter by artist or category, or search for a title."
            : "Original paintings and studies. Filter by category or search for a title."
        }
      />
      <Suspense fallback={<GalleryLoading />}>
        <GalleryExplorer artworks={artworks} artists={artists.map(({ id, name, slug }) => ({ id, name, slug }))} />
      </Suspense>
    </div>
  );
}
