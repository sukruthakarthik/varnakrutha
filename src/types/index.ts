export const CATEGORIES = [
  "heritage",
  "temple-art",
  "landscape",
  "watercolor",
  "acrylic",
  "sketches",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const AVAILABILITY = ["available", "sold", "reserved"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const INQUIRY_STATUS = ["new", "read", "archived"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUS)[number];

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  profileImage: string | null;
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
  pinterest: string | null;
  website: string | null;
  createdAt: string;
}

export interface ArtworkImage {
  id: string;
  artworkId: string;
  imageUrl: string;
  displayOrder: number;
}

export interface Artwork {
  id: string;
  artistId: string;
  title: string;
  slug: string;
  description: string | null;
  story: string | null;
  year: number | null;
  medium: string | null;
  category: Category;
  /** Centimetres */
  width: number | null;
  /** Centimetres */
  height: number | null;
  price: number | null;
  availability: Availability;
  featured: boolean;
  coverImage: string | null;
  images: ArtworkImage[];
  createdAt: string;
}

export interface Inquiry {
  id: string;
  artistId: string;
  artworkId: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface InquiryWithArtwork extends Inquiry {
  artwork: Pick<Artwork, "id" | "title" | "slug"> | null;
}
