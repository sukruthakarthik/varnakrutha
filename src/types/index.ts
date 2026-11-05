export const CATEGORIES = [
  "heritage",
  "temple-art",
  "landscape",
  "watercolor",
  "acrylic",
  "sketches",
  "digital",
  "abstract",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** An artwork can sit in several categories at once (e.g. digital and abstract). */
export const MAX_CATEGORIES = 5;

export const AVAILABILITY = ["available", "sold", "reserved"] as const;
export type Availability = (typeof AVAILABILITY)[number];

/** "spam": kept but hidden from the inbox; the sender's email is blocked. */
export const INQUIRY_STATUS = ["new", "read", "archived", "spam"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUS)[number];

/** "spam": kept but hidden; the applicant's email is blocked. */
export const APPLICATION_STATUS = ["new", "shortlisted", "accepted", "declined", "spam"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export interface ArtistApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  portfolioUrl: string;
  sampleLinks: string[];
  mediums: string | null;
  statement: string;
  status: ApplicationStatus;
  /** Private to platform admins. */
  adminNote: string | null;
  /** The artist created when the application was accepted. */
  artistId: string | null;
  createdAt: string;
}

export const HERO_LAYOUTS = ["split", "wide", "overlay"] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export interface ArtistTechnique {
  name: string;
  description: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  /** Short line under the name on the home page; falls back to the site tagline when null. */
  tagline: string | null;
  /** Home page hero arrangement. */
  heroLayout: HeroLayout;
  bio: string | null;
  profileImage: string | null;
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
  pinterest: string | null;
  website: string | null;
  /** About page paragraphs. */
  journey: string[];
  inspiration: string[];
  skills: string[];
  techniques: ArtistTechnique[];
  /** Null until a platform admin first approves the profile. */
  approvedAt: string | null;
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
  /** At least one, in CATEGORIES order. The first decides the storage folder for new uploads. */
  categories: Category[];
  /** Centimetres */
  width: number | null;
  /** Centimetres */
  height: number | null;
  price: number | null;
  /** Rupees, added to the price for online orders; null = free shipping. */
  shippingFee: number | null;
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
  /** Who the enquiry is about; inquiries for every artist are handled by admins. */
  artist: Pick<Artist, "name" | "slug"> | null;
}

/** An email whose enquiries and applications are filed as spam automatically. */
export interface BlockedEmail {
  email: string;
  reason: string | null;
  createdAt: string;
}

// ─── Orders and payments (see docs/PAYMENTS.md) ─────────────────────

export const ORDER_STATUS = ["pending", "paid", "shipped", "completed", "cancelled", "refunded", "expired", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

/** Statuses that hold the artwork, so nobody else can buy it. */
export const ACTIVE_ORDER_STATUS: OrderStatus[] = ["pending", "paid", "shipped"];

/** "full": price + shipping paid now. "deposit": the commission paid now; the balance goes to the artist directly. */
export type OrderKind = "full" | "deposit";
export type OrderMethod = "upi_manual" | "razorpay" | "offline";

export interface Order {
  id: string;
  reference: string;
  /** Secret in the buyer's order link. Never send to artists or render outside the buyer's own page. */
  accessToken: string;
  artworkId: string | null;
  artistId: string;
  artworkTitle: string;
  kind: OrderKind;
  method: OrderMethod;
  status: OrderStatus;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  /** All amounts in paise. */
  pricePaise: number;
  shippingPaise: number;
  amountPaise: number;
  commissionBps: number;
  commissionPaise: number;
  artistSharePaise: number;
  paymentReference: string | null;
  razorpayOrderId: string | null;
  razorpayTransferId: string | null;
  tracking: string | null;
  adminNote: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  type: string;
  detail: string | null;
  createdAt: string;
}
