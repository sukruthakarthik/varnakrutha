import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { CATEGORY_META } from "@/lib/constants";
import type { ArtworkInput } from "@/features/artworks/schemas";
import { buildImageFileName, validateImageFile } from "@/services/image-validation";
import {
  RepositoryError,
  type ArtworkFilters,
  type DataSource,
  type UploadImageParams,
} from "@/services/types";
import type { Artwork, Inquiry } from "@/types";
import { getMockDb, persistMockDb } from "./store";

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

function toArtwork(
  id: string,
  artistId: string,
  input: ArtworkInput,
  createdAt: string,
): Artwork {
  const images = input.images.map((imageUrl, i) => ({
    id: crypto.randomUUID(),
    artworkId: id,
    imageUrl,
    displayOrder: i,
  }));
  return {
    id,
    artistId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    story: input.story,
    year: input.year,
    medium: input.medium,
    category: input.category,
    width: input.width,
    height: input.height,
    price: input.price,
    availability: input.availability,
    featured: input.featured,
    coverImage: input.coverImage ?? images[0]?.imageUrl ?? null,
    images,
    createdAt,
  };
}

export function createMockDataSource(): DataSource {
  return {
    artists: {
      async list() {
        return (await getMockDb()).artists;
      },
      async getBySlug(slug) {
        return (await getMockDb()).artists.find((a) => a.slug === slug) ?? null;
      },
    },

    artworks: {
      async list(filters: ArtworkFilters = {}) {
        const db = await getMockDb();
        const result = db.artworks
          .filter(
            (a) =>
              (!filters.artistId || a.artistId === filters.artistId) &&
              (!filters.category || a.category === filters.category) &&
              (!filters.availability || a.availability === filters.availability) &&
              (filters.featured === undefined || a.featured === filters.featured),
          )
          .sort(byNewest);
        return filters.limit ? result.slice(0, filters.limit) : result;
      },
      async getBySlug(slug, artistId) {
        const db = await getMockDb();
        return (
          db.artworks.find((a) => a.slug === slug && (!artistId || a.artistId === artistId)) ??
          null
        );
      },
      async getById(id) {
        return (await getMockDb()).artworks.find((a) => a.id === id) ?? null;
      },
      async create(artistId, input) {
        const db = await getMockDb();
        if (db.artworks.some((a) => a.artistId === artistId && a.slug === input.slug)) {
          throw new RepositoryError("An artwork with this slug already exists", "conflict");
        }
        const artwork = toArtwork(crypto.randomUUID(), artistId, input, new Date().toISOString());
        db.artworks.push(artwork);
        await persistMockDb(db);
        return artwork;
      },
      async update(id, input) {
        const db = await getMockDb();
        const index = db.artworks.findIndex((a) => a.id === id);
        const existing = db.artworks[index];
        if (!existing) throw new RepositoryError("Artwork not found", "not_found");
        if (
          db.artworks.some(
            (a) => a.id !== id && a.artistId === existing.artistId && a.slug === input.slug,
          )
        ) {
          throw new RepositoryError("An artwork with this slug already exists", "conflict");
        }
        const updated = toArtwork(id, existing.artistId, input, existing.createdAt);
        db.artworks[index] = updated;
        await persistMockDb(db);
        return updated;
      },
      async setAvailability(id, availability) {
        const db = await getMockDb();
        const artwork = db.artworks.find((a) => a.id === id);
        if (!artwork) throw new RepositoryError("Artwork not found", "not_found");
        artwork.availability = availability;
        await persistMockDb(db);
      },
      async delete(id) {
        const db = await getMockDb();
        db.artworks = db.artworks.filter((a) => a.id !== id);
        for (const inquiry of db.inquiries) {
          if (inquiry.artworkId === id) inquiry.artworkId = null;
        }
        await persistMockDb(db);
      },
    },

    inquiries: {
      async create(artistId, input) {
        const db = await getMockDb();
        const inquiry: Inquiry = {
          id: crypto.randomUUID(),
          artistId,
          artworkId: input.artworkId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject,
          message: input.message,
          status: "new",
          createdAt: new Date().toISOString(),
        };
        db.inquiries.push(inquiry);
        await persistMockDb(db);
        return inquiry;
      },
      async list(artistId) {
        const db = await getMockDb();
        return db.inquiries
          .filter((i) => i.artistId === artistId)
          .sort(byNewest)
          .map((i) => {
            const artwork = db.artworks.find((a) => a.id === i.artworkId);
            return {
              ...i,
              artwork: artwork ? { id: artwork.id, title: artwork.title, slug: artwork.slug } : null,
            };
          });
      },
      async setStatus(id, status) {
        const db = await getMockDb();
        const inquiry = db.inquiries.find((i) => i.id === id);
        if (!inquiry) throw new RepositoryError("Inquiry not found", "not_found");
        inquiry.status = status;
        await persistMockDb(db);
      },
      async delete(id) {
        const db = await getMockDb();
        db.inquiries = db.inquiries.filter((i) => i.id !== id);
        await persistMockDb(db);
      },
    },

    storage: {
      async uploadArtworkImage({ artistSlug, category, artworkSlug, file }: UploadImageParams) {
        const { bytes, extension } = await validateImageFile(file);
        const folder = CATEGORY_META[category].storageFolder;
        const fileName = buildImageFileName(category, artworkSlug, extension);
        const dir = path.join(process.cwd(), "public", "artworks", artistSlug, folder);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), bytes);
        return `/artworks/${artistSlug}/${folder}/${fileName}`;
      },
    },
  };
}
