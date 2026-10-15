import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { defaultOpenGraph, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Copyright & Disclaimer",
  description: "Who owns the artworks on this site, how they may be used, and what we are not responsible for.",
  alternates: { canonical: "/copyright" },
  openGraph: { ...defaultOpenGraph, url: "/copyright", title: `Copyright & Disclaimer | ${siteConfig.name}` },
};

const LAST_UPDATED = "15 October 2026";

export default function CopyrightPage() {
  const contact = siteConfig.contactEmail ? (
    <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary underline-offset-4 hover:underline">
      {siteConfig.contactEmail}
    </a>
  ) : (
    <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
      the contact page
    </Link>
  );

  return (
    <div className="container-page max-w-3xl space-y-10 py-16 md:py-20">
      <SectionHeading as="h1" eyebrow="Using this site" title="Copyright & Disclaimer" description={`Last updated ${LAST_UPDATED}`} />

      <div className="space-y-8 leading-relaxed text-foreground/85 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <h2>Who owns the artworks</h2>
          <p>
            Every artwork on {siteConfig.name} belongs to the artist who made it, who keeps the copyright. Showing a work
            here, or selling the original painting, does not transfer its copyright to anyone.
          </p>
        </section>

        <section>
          <h2>Please don&apos;t copy</h2>
          <p>Without the artist&apos;s written permission, you may not:</p>
          <ul>
            <li>download, copy, print or reproduce the images;</li>
            <li>sell, share or publish copies, prints or derivatives of the artworks;</li>
            <li>use the artworks in products, advertising, or to train AI or other software.</li>
          </ul>
          <p>Sharing a link to a page on this site is always welcome.</p>
        </section>

        <section>
          <h2>Copies we are not responsible for</h2>
          <p>
            We take reasonable steps to discourage copying, but anything shown on a screen can be captured. {siteConfig.name}{" "}
            is not responsible for, and does not endorse, any unauthorised copy, print, reproduction or imitation of an
            artwork shown here, wherever it appears. Any such use is the sole responsibility of whoever made it.
          </p>
        </section>

        <section>
          <h2>Featured artists&apos; work</h2>
          <p>
            Each featured artist confirms that the work they show is their own original work and that they have the right
            to show and sell it. Artists are responsible for the originality of their work. {siteConfig.name} does not
            verify the ownership of every piece and is not responsible for a copied or infringing work an artist
            submits, but we will act promptly when one is reported.
          </p>
        </section>

        <section>
          <h2>Reporting a copy</h2>
          <p>
            If you believe a work on this site copies yours, or you have found a copy of a work shown here, write to{" "}
            {contact} with links to both works and any proof of authorship. We will review it and remove infringing
            material.
          </p>
        </section>
      </div>
    </div>
  );
}
