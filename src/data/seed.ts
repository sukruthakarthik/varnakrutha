import type { Artist, Artwork, Category } from "@/types";
import { CATEGORY_META } from "@/lib/constants";

// Fixed UUIDs keep this file in sync with supabase/seed.sql.
export const SEED_ARTIST_ID = "00000000-0000-4000-8000-000000000001";

export const seedArtists: Artist[] = [
  {
    id: SEED_ARTIST_ID,
    name: "Sukrutha Karthik",
    slug: "sukrutha",
    bio: "Sukrutha Karthik is an Indian artist who paints heritage monuments, temple architecture and the landscapes that surround them. Working mainly in watercolor and acrylic, she is drawn to the quiet dialogue between stone, light and time.",
    profileImage: "/artists/sukrutha/profile.svg",
    instagram: "https://www.instagram.com/",
    youtube: "https://www.youtube.com/",
    facebook: "https://www.facebook.com/",
    pinterest: "https://www.pinterest.com/",
    website: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

interface SeedArtworkDef {
  n: number;
  title: string;
  slug: string;
  category: Category;
  medium: string;
  year: number;
  width: number;
  height: number;
  price: number | null;
  availability: Artwork["availability"];
  featured: boolean;
  description: string;
  story: string;
  extraImages: number;
}

const defs: SeedArtworkDef[] = [
  {
    n: 1,
    title: "Lepakshi Temple",
    slug: "lepakshi-temple-watercolor",
    category: "heritage",
    medium: "Watercolor on paper",
    year: 2024,
    width: 56,
    height: 38,
    price: 18000,
    availability: "available",
    featured: true,
    description:
      "The Veerabhadra temple at Lepakshi in soft morning light, its carved pillars glowing against a pale sky.",
    story:
      "I first visited Lepakshi on a winter morning when the stone was still cool to the touch. The famous hanging pillar, the monolithic Nandi and the faded ceiling murals stayed with me for weeks. This painting began as a quick sketch on site and was completed in the studio over many layered washes, trying to hold on to that first impression of light moving across granite.",
    extraImages: 2,
  },
  {
    n: 2,
    title: "Hampi Stone Chariot",
    slug: "hampi-stone-chariot",
    category: "heritage",
    medium: "Acrylic on canvas",
    year: 2023,
    width: 60,
    height: 45,
    price: 24000,
    availability: "sold",
    featured: true,
    description:
      "The iconic stone chariot of the Vittala temple complex, painted in warm late-afternoon tones.",
    story:
      "Hampi feels like a city that is still breathing. I wanted the chariot to feel less like a monument and more like something that could roll forward at any moment, so I kept the edges loose and let the sunset colours bleed into the stone.",
    extraImages: 1,
  },
  {
    n: 3,
    title: "Meenakshi Temple Gopuram",
    slug: "meenakshi-temple-gopuram",
    category: "temple-art",
    medium: "Acrylic on canvas",
    year: 2024,
    width: 45,
    height: 75,
    price: 32000,
    availability: "available",
    featured: true,
    description:
      "A towering, colour-rich study of the southern gopuram of the Meenakshi Amman temple in Madurai.",
    story:
      "Thousands of sculpted figures crowd each tier of the gopuram. Rather than painting every one, I tried to capture the rhythm they create together — a vertical song of colour rising into the sky.",
    extraImages: 2,
  },
  {
    n: 4,
    title: "Monsoon over the Western Ghats",
    slug: "western-ghats-monsoon",
    category: "landscape",
    medium: "Watercolor on paper",
    year: 2025,
    width: 50,
    height: 35,
    price: 15000,
    availability: "available",
    featured: true,
    description: "Rolling mist and deep greens over the Sahyadri hills during the first rains.",
    story:
      "Painted wet-on-wet to let the clouds form on their own. Watercolor behaves a little like the monsoon itself — you guide it, but you never fully control it.",
    extraImages: 0,
  },
  {
    n: 5,
    title: "Backwaters at Dusk",
    slug: "kerala-backwaters-dusk",
    category: "watercolor",
    medium: "Watercolor on paper",
    year: 2025,
    width: 38,
    height: 28,
    price: 12000,
    availability: "reserved",
    featured: false,
    description: "A lone boat drifting through the Kerala backwaters as the sky turns amber.",
    story:
      "A small, quiet piece painted in a single sitting. I wanted to keep it simple: water, sky, and the silhouette of palms.",
    extraImages: 0,
  },
  {
    n: 6,
    title: "Lotus Pond",
    slug: "lotus-pond-acrylic",
    category: "acrylic",
    medium: "Acrylic on canvas",
    year: 2023,
    width: 40,
    height: 40,
    price: 16000,
    availability: "available",
    featured: false,
    description: "Pink lotuses rising from a still temple tank, rendered in layered acrylic.",
    story:
      "Temple tanks are often overlooked in favour of the temples themselves. This painting is a small tribute to the stillness they hold.",
    extraImages: 1,
  },
  {
    n: 7,
    title: "Mysore Palace Study",
    slug: "mysore-palace-study",
    category: "sketches",
    medium: "Graphite on paper",
    year: 2022,
    width: 42,
    height: 30,
    price: null,
    availability: "available",
    featured: false,
    description: "An on-location graphite study of the domes and arches of the Mysore Palace.",
    story:
      "Drawn over two hours while sitting on the palace lawns. Sketches like this are where most of my paintings begin.",
    extraImages: 0,
  },
  {
    n: 8,
    title: "Rhythms of Kolam",
    slug: "rhythms-of-kolam",
    category: "other",
    medium: "Mixed media on board",
    year: 2025,
    width: 30,
    height: 30,
    price: 9000,
    availability: "available",
    featured: false,
    description: "An abstract piece inspired by the geometry of kolam patterns drawn at doorsteps.",
    story:
      "Every morning, kolam patterns appear and disappear on doorsteps across South India. This piece explores that cycle of making and letting go.",
    extraImages: 0,
  },
];

const pad = (n: number, len = 12) => n.toString().padStart(len, "0");
const artworkId = (n: number) => `10000000-0000-4000-8000-${pad(n)}`;
const imageId = (n: number, i: number) => `20000000-0000-4000-8000-${pad(n * 100 + i)}`;

export function seedImagePath(category: Category, slug: string, variant: string): string {
  const folder = CATEGORY_META[category].storageFolder;
  return `/artworks/sukrutha/${folder}/${category}-${slug}-${variant}.svg`;
}

export const seedArtworks: Artwork[] = defs.map((d) => {
  const id = artworkId(d.n);
  const cover = seedImagePath(d.category, d.slug, "main");
  const variants = ["main", ...Array.from({ length: d.extraImages }, (_, i) => `detail-${i + 1}`)];
  return {
    id,
    artistId: SEED_ARTIST_ID,
    title: d.title,
    slug: d.slug,
    description: d.description,
    story: d.story,
    year: d.year,
    medium: d.medium,
    category: d.category,
    width: d.width,
    height: d.height,
    price: d.price,
    availability: d.availability,
    featured: d.featured,
    coverImage: cover,
    images: variants.map((v, i) => ({
      id: imageId(d.n, i),
      artworkId: id,
      imageUrl: seedImagePath(d.category, d.slug, v),
      displayOrder: i,
    })),
    createdAt: new Date(Date.UTC(d.year, d.n - 1, 1)).toISOString(),
  };
});
