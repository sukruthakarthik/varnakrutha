import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { SocialLinks } from "@/components/common/social-links";
import { Button } from "@/components/ui/button";
import { getArtistProfileContent } from "@/features/artists/content";
import { defaultOpenGraph } from "@/lib/site";
import { getCurrentArtist } from "@/services";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About the Artist",
  description:
    "Meet Sukrutha Karthik — her artistic journey, inspiration, skills and the techniques behind her heritage paintings and landscapes.",
  alternates: { canonical: "/about" },
  openGraph: { ...defaultOpenGraph, url: "/about", title: "About the Artist | Art By Sukrutha" },
};

export default async function AboutPage() {
  const artist = await getCurrentArtist();
  const content = getArtistProfileContent(artist.slug);

  return (
    <div className="py-16 md:py-20">
      <section className="container-page grid items-start gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-20">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-secondary">
          {artist.profileImage && (
            <Image
              src={artist.profileImage}
              alt={`Portrait of ${artist.name}`}
              fill
              priority
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="space-y-8">
          <SectionHeading as="h1" eyebrow="About the artist" title={artist.name} />
          <p className="text-xl leading-relaxed text-foreground/80">{artist.bio}</p>
          <SocialLinks artist={artist} />
        </div>
      </section>

      {content && (
        <>
          <section className="container-page mt-24 grid gap-12 md:grid-cols-2 md:gap-20">
            <div className="space-y-5">
              <h2 className="text-3xl md:text-4xl">Artistic Journey</h2>
              {content.journey.map((p, i) => (
                <p key={i} className="leading-relaxed text-foreground/80">
                  {p}
                </p>
              ))}
            </div>
            <div className="space-y-5">
              <h2 className="text-3xl md:text-4xl">Inspiration</h2>
              <ul className="space-y-4">
                {content.inspiration.map((item) => (
                  <li key={item} className="border-l-2 border-primary pl-4 leading-relaxed text-foreground/80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-24 bg-secondary/50 py-16 md:py-20">
            <div className="container-page grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
              <div className="space-y-5">
                <h2 className="text-3xl md:text-4xl">Skills</h2>
                <ul className="flex flex-wrap gap-2">
                  {content.skills.map((s) => (
                    <li key={s} className="rounded-full border border-foreground/15 bg-background px-4 py-1.5 text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <h2 className="text-3xl md:text-4xl">Techniques</h2>
                <dl className="grid gap-6 sm:grid-cols-3">
                  {content.techniques.map((t) => (
                    <div key={t.name} className="space-y-2">
                      <dt className="font-serif text-2xl text-primary">{t.name}</dt>
                      <dd className="text-sm leading-relaxed text-foreground/80">{t.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="container-page mt-24 text-center">
        <h2 className="text-3xl md:text-4xl">See the work</h2>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/gallery">View Gallery</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">Get in touch</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
