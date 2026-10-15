import { env } from "@/lib/env";

export const siteConfig = {
  // The platform. Each artist's own pages are titled "Art by <first name>" (see artistBrand).
  name: "Varnakrutha",
  tagline: "Original Paintings, Heritage Art, Landscapes and Creative Expressions",
  description:
    "Varnakrutha is an online gallery of original paintings by Sukrutha Karthik and featured artists: heritage, temple art, landscapes, watercolors, acrylics and sketches.",
  url: env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
  defaultArtistSlug: env.NEXT_PUBLIC_DEFAULT_ARTIST_SLUG,
  // Both optional: links are hidden when unset.
  contactEmail: env.NEXT_PUBLIC_CONTACT_EMAIL ?? null,
  whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null,
  nav: [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/artists", label: "Artists" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export const defaultOgImage = { url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.name };

// Child segments replace (not merge) openGraph, so pages spread this to keep shared fields.
export const defaultOpenGraph = {
  type: "website" as const,
  siteName: siteConfig.name,
  locale: "en_IN",
  images: [defaultOgImage],
};

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** WhatsApp click-to-chat link with an optional pre-filled message, or null when no number is set. */
export function whatsappUrl(message?: string): string | null {
  if (!siteConfig.whatsappNumber) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${siteConfig.whatsappNumber}${query}`;
}

/** Every approved artist has a portfolio page, including the site's own artist. */
export function artistPath(artistSlug: string): string {
  return `/artists/${artistSlug}`;
}

/** The site's own artist keeps the short /artworks/<slug> URLs; other artists' slugs are only unique per artist. */
export function artworkPath(artworkSlug: string, artistSlug: string): string {
  return artistSlug === siteConfig.defaultArtistSlug
    ? `/artworks/${artworkSlug}`
    : `/artists/${artistSlug}/artworks/${artworkSlug}`;
}

/** "Sukrutha Karthik" → "Sukrutha". */
export function artistFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** An artist's own brand on their pages, e.g. "Art by Dhyan". */
export function artistBrand(name: string): string {
  return `Art by ${artistFirstName(name)}`;
}
