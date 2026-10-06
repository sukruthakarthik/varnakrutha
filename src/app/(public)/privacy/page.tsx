import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { defaultOpenGraph, siteConfig } from "@/lib/site";
import { getCurrentArtist } from "@/services";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses and protects the details you share through this website.`,
  alternates: { canonical: "/privacy" },
  openGraph: { ...defaultOpenGraph, url: "/privacy", title: `Privacy Policy | ${siteConfig.name}` },
};

const LAST_UPDATED = "6 October 2026";

export default async function PrivacyPage() {
  const artist = await getCurrentArtist();
  const contact = siteConfig.contactEmail ? (
    <a href={`mailto:${siteConfig.contactEmail}`} className="underline underline-offset-4 hover:text-primary">
      {siteConfig.contactEmail}
    </a>
  ) : (
    <Link href="/contact" className="underline underline-offset-4 hover:text-primary">
      the contact form
    </Link>
  );

  return (
    <div className="container-page max-w-3xl space-y-10 py-16 md:py-20">
      <SectionHeading as="h1" eyebrow="Your data" title="Privacy Policy" description={`Last updated ${LAST_UPDATED}`} />

      <div className="space-y-8 leading-relaxed text-foreground/85 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <h2>Who we are</h2>
          <p>
            This website is the online gallery of {artist.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are
            responsible for the personal data you share here.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <p>When you send a message through the contact or enquiry form, we collect:</p>
          <ul>
            <li>your name and email address</li>
            <li>your phone number, if you choose to give it</li>
            <li>the subject and message you write, and the artwork you asked about</li>
          </ul>
          <p className="mt-3">
            We do not use advertising or tracking cookies. Browsing the gallery does not require you to share
            any personal details.
          </p>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            Only to reply to your message and, if you go ahead, to arrange a purchase, commission or
            delivery. We do not sell your details, share them for marketing, or add you to a mailing list.
          </p>
        </section>

        <section>
          <h2>Where it is stored</h2>
          <p>
            Messages are stored securely with our database provider, Supabase. The website is hosted by
            Vercel. These providers process data on our behalf and only as needed to run the site.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>
            We keep your message only as long as needed to respond and to keep records of any sale, and then
            delete it.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Under India&rsquo;s Digital Personal Data Protection Act, 2023, you can ask us to access, correct
            or delete your personal data, or withdraw your consent, at any time. Contact us at {contact} and we
            will respond promptly.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>If we change this policy, we will update it on this page with a new date.</p>
        </section>
      </div>
    </div>
  );
}
