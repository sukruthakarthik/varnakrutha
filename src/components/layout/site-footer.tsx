import Link from "next/link";
import { SocialLinks } from "@/components/common/social-links";
import { siteConfig, whatsappUrl } from "@/lib/site";
import type { Artist } from "@/types";

export function SiteFooter({ artist }: { artist: Artist }) {
  const whatsapp = whatsappUrl();
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div className="space-y-3">
          <p className="font-serif text-2xl">
            Art By <span className="text-primary">Sukrutha</span>
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2 text-sm">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-foreground/80 hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="eyebrow mb-4">Follow</p>
          <SocialLinks artist={artist} />
          {siteConfig.contactEmail && (
            <p className="mt-4 text-sm text-muted-foreground">
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-primary">
                {siteConfig.contactEmail}
              </a>
            </p>
          )}
          {whatsapp && (
            <p className="mt-2 text-sm text-muted-foreground">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                WhatsApp
              </a>
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-page py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {artist.name}. All artworks are original and protected by copyright.{" "}
          <Link href="/privacy" className="underline-offset-4 hover:text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
