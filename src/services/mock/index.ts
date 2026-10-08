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
  type UploadProfileImageParams,
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
      async getById(id) {
        return (await getMockDb()).artists.find((a) => a.id === id) ?? null;
      },
      async updateProfile(id, input) {
        const db = await getMockDb();
        const index = db.artists.findIndex((a) => a.id === id);
        const existing = db.artists[index];
        if (!existing) throw new RepositoryError("Artist not found", "not_found");
        const updated = { ...existing, ...input };
        db.artists[index] = updated;
        await persistMockDb(db);
        return updated;
      },
      async approve(id) {
        const db = await getMockDb();
        const artist = db.artists.find((a) => a.id === id);
        if (!artist) throw new RepositoryError("Artist not found", "not_found");
        artist.approvedAt ??= new Date().toISOString();
        await persistMockDb(db);
      },
    },

    profileReviews: {
      async list() {
        const db = await getMockDb();
        return db.profileReviews
          .map((r) => ({ ...r, artistName: db.artists.find((a) => a.id === r.artistId)?.name ?? "" }))
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
      },
      async get(artistId) {
        const db = await getMockDb();
        const review = db.profileReviews.find((r) => r.artistId === artistId);
        if (!review) return null;
        return { ...review, artistName: db.artists.find((a) => a.id === artistId)?.name ?? "" };
      },
      async submit(artistId, profile) {
        const db = await getMockDb();
        db.profileReviews = db.profileReviews.filter((r) => r.artistId !== artistId);
        db.profileReviews.push({ artistId, profile, submittedAt: new Date().toISOString() });
        await persistMockDb(db);
      },
      async delete(artistId) {
        const db = await getMockDb();
        db.profileReviews = db.profileReviews.filter((r) => r.artistId !== artistId);
        await persistMockDb(db);
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

    applications: {
      async create(input) {
        const db = await getMockDb();
        db.applications.push({
          ...input,
          id: crypto.randomUUID(),
          status: "new",
          adminNote: null,
          createdAt: new Date().toISOString(),
        });
        await persistMockDb(db);
      },
      async list() {
        return [...(await getMockDb()).applications].sort(byNewest);
      },
      async update(id, { status, adminNote }) {
        const db = await getMockDb();
        const application = db.applications.find((a) => a.id === id);
        if (!application) throw new RepositoryError("Application not found", "not_found");
        application.status = status;
        application.adminNote = adminNote;
        await persistMockDb(db);
      },
      async delete(id) {
        const db = await getMockDb();
        db.applications = db.applications.filter((a) => a.id !== id);
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
      async uploadProfileImage({ artistSlug, file }: UploadProfileImageParams) {
        const { bytes, extension } = await validateImageFile(file);
        const fileName = buildImageFileName("profile", artistSlug, extension);
        const dir = path.join(process.cwd(), "public", "artworks", artistSlug, "profile");
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), bytes);
        return `/artworks/${artistSlug}/profile/${fileName}`;
      },
    },
  };
}
