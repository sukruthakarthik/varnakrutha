import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { SocialLinks } from "@/components/common/social-links";
import { ContactForm } from "@/features/inquiries/components/contact-form";
import { defaultOpenGraph, siteConfig, whatsappUrl } from "@/lib/site";
import { getCurrentArtist, getPublicDataSource } from "@/services";

export const metadata: Metadata = {
  title: "Contact",
  description: "Enquire about original artworks, commissions or exhibitions with artist Sukrutha Karthik.",
  alternates: { canonical: "/contact" },
  openGraph: { ...defaultOpenGraph, url: "/contact", title: "Contact | Art By Sukrutha" },
};

type Props = { searchParams: Promise<{ artwork?: string | string[] }> };

export default async function ContactPage({ searchParams }: Props) {
  const { artwork: artworkParam } = await searchParams;
  const artist = await getCurrentArtist();
  const slug = typeof artworkParam === "string" ? artworkParam : undefined;
  const artwork = slug ? await (await getPublicDataSource()).artworks.getBySlug(slug, artist.id) : null;
  const whatsapp = whatsappUrl(
    artwork ? `Hi ${artist.name}, I'm interested in "${artwork.title}".` : `Hi ${artist.name}, `,
  );

  return (
    <div className="container-page grid gap-16 py-16 md:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
      <div className="space-y-8">
        <SectionHeading
          as="h1"
          eyebrow="Get in touch"
          title="Contact the Artist"
          description="For purchase enquiries, commissions, collaborations or exhibitions — I'd love to hear from you."
        />
        {(whatsapp || siteConfig.contactEmail) && (
          <ul className="space-y-3">
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-foreground/80 hover:text-primary">
                  <MessageCircle className="size-5" aria-hidden /> Chat on WhatsApp
                </a>
              </li>
            )}
            {siteConfig.contactEmail && (
              <li>
                <a href={`mailto:${siteConfig.contactEmail}`} className="inline-flex items-center gap-3 text-foreground/80 hover:text-primary">
                  <Mail className="size-5" aria-hidden /> {siteConfig.contactEmail}
                </a>
              </li>
            )}
          </ul>
        )}
        <SocialLinks artist={artist} />
      </div>
      <div>
        {artwork && (
          <p className="mb-6 rounded-sm bg-secondary/60 px-4 py-3 text-sm">
            Enquiring about <strong className="font-medium">{artwork.title}</strong>
          </p>
        )}
        <ContactForm artwork={artwork ? { id: artwork.id, title: artwork.title } : null} />
      </div>
    </div>
  );
}
