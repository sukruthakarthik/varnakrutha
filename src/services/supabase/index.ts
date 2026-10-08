import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_META, STORAGE_BUCKET } from "@/lib/constants";
import type { ApplicationInput } from "@/features/applications/schemas";
import type { ArtistProfileInput } from "@/features/artists/schemas";
import type { ArtworkInput } from "@/features/artworks/schemas";
import { buildImageFileName, validateImageFile } from "@/services/image-validation";
import {
  RepositoryError,
  type ArtworkFilters,
  type DataSource,
  type ProfileReview,
} from "@/services/types";
import type {
  ApplicationStatus,
  Artist,
  ArtistApplication,
  ArtistTechnique,
  Artwork,
  Availability,
  Category,
  HeroLayout,
  InquiryStatus,
  InquiryWithArtwork,
} from "@/types";

interface ArtistRow {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  hero_layout: HeroLayout | null;
  bio: string | null;
  profile_image: string | null;
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
  pinterest: string | null;
  website: string | null;
  journey: string[] | null;
  inspiration: string[] | null;
  skills: string[] | null;
  techniques: ArtistTechnique[] | null;
  approved_at: string | null;
  created_at: string;
}

interface ProfileReviewRow {
  artist_id: string;
  profile: ArtistProfileInput;
  submitted_at: string;
  artists: { name: string } | null;
}

interface ArtworkImageRow {
  id: string;
  artwork_id: string;
  image_url: string;
  display_order: number;
}

interface ArtworkRow {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  description: string | null;
  story: string | null;
  year: number | null;
  medium: string | null;
  category: Category;
  width: number | null;
  height: number | null;
  price: number | null;
  availability: Availability;
  featured: boolean;
  cover_image: string | null;
  created_at: string;
  artwork_images?: ArtworkImageRow[];
}

interface InquiryRow {
  id: string;
  artist_id: string;
  artwork_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
  artworks: { id: string; title: string; slug: string } | null;
}

interface ApplicationRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  portfolio_url: string;
  sample_links: string[] | null;
  mediums: string | null;
  statement: string;
  status: ApplicationStatus;
  admin_note: string | null;
  created_at: string;
}

const ARTWORK_SELECT = "*, artwork_images(*)";

function fail(error: PostgrestError | null): void {
  if (!error) return;
  if (error.code === "23505") {
    throw new RepositoryError("An artwork with this slug already exists", "conflict");
  }
  throw new RepositoryError(error.message);
}

const toArtist = (r: ArtistRow): Artist => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  tagline: r.tagline,
  heroLayout: r.hero_layout ?? "wide",
  bio: r.bio,
  profileImage: r.profile_image,
  instagram: r.instagram,
  youtube: r.youtube,
  facebook: r.facebook,
  pinterest: r.pinterest,
  website: r.website,
  journey: r.journey ?? [],
  inspiration: r.inspiration ?? [],
  skills: r.skills ?? [],
  techniques: r.techniques ?? [],
  approvedAt: r.approved_at,
  createdAt: r.created_at,
});

const toProfileReview = (r: ProfileReviewRow): ProfileReview => ({
  artistId: r.artist_id,
  artistName: r.artists?.name ?? "",
  profile: r.profile,
  submittedAt: r.submitted_at,
});

const PROFILE_REVIEW_SELECT = "artist_id, profile, submitted_at, artists(name)";

const toArtistProfileRow = (input: ArtistProfileInput) => ({
  name: input.name,
  tagline: input.tagline,
  hero_layout: input.heroLayout,
  bio: input.bio,
  profile_image: input.profileImage,
  instagram: input.instagram,
  youtube: input.youtube,
  facebook: input.facebook,
  pinterest: input.pinterest,
  website: input.website,
  journey: input.journey,
  inspiration: input.inspiration,
  skills: input.skills,
  techniques: input.techniques,
});

const toArtwork = (r: ArtworkRow): Artwork => ({
  id: r.id,
  artistId: r.artist_id,
  title: r.title,
  slug: r.slug,
  description: r.description,
  story: r.story,
  year: r.year,
  medium: r.medium,
  category: r.category,
  width: r.width === null ? null : Number(r.width),
  height: r.height === null ? null : Number(r.height),
  price: r.price === null ? null : Number(r.price),
  availability: r.availability,
  featured: r.featured,
  coverImage: r.cover_image,
  images: (r.artwork_images ?? [])
    .map((i) => ({
      id: i.id,
      artworkId: i.artwork_id,
      imageUrl: i.image_url,
      displayOrder: i.display_order,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder),
  createdAt: r.created_at,
});

const toApplication = (r: ApplicationRow): ArtistApplication => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  city: r.city,
  portfolioUrl: r.portfolio_url,
  sampleLinks: r.sample_links ?? [],
  mediums: r.mediums,
  statement: r.statement,
  status: r.status,
  adminNote: r.admin_note,
  createdAt: r.created_at,
});

const toArtworkRow = (input: ArtworkInput) => ({
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
  cover_image: input.coverImage ?? input.images[0] ?? null,
});

export function createSupabaseDataSource(client: SupabaseClient): DataSource {
  async function replaceImages(artworkId: string, images: string[]) {
    fail((await client.from("artwork_images").delete().eq("artwork_id", artworkId)).error);
    if (images.length === 0) return;
    const rows = images.map((image_url, display_order) => ({
      artwork_id: artworkId,
      image_url,
      display_order,
    }));
    fail((await client.from("artwork_images").insert(rows)).error);
  }

  async function getArtworkOrThrow(id: string): Promise<Artwork> {
    const { data, error } = await client
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("id", id)
      .single<ArtworkRow>();
    fail(error);
    if (!data) throw new RepositoryError("Artwork not found", "not_found");
    return toArtwork(data);
  }

  return {
    artists: {
      async list() {
        const { data, error } = await client.from("artists").select("*").order("name");
        fail(error);
        return ((data ?? []) as ArtistRow[]).map(toArtist);
      },
      async getBySlug(slug) {
        const { data, error } = await client
          .from("artists")
          .select("*")
          .eq("slug", slug)
          .maybeSingle<ArtistRow>();
        fail(error);
        return data ? toArtist(data) : null;
      },
      async getById(id) {
        const { data, error } = await client
          .from("artists")
          .select("*")
          .eq("id", id)
          .maybeSingle<ArtistRow>();
        fail(error);
        return data ? toArtist(data) : null;
      },
      async updateProfile(id, input) {
        const { data, error } = await client
          .from("artists")
          .update(toArtistProfileRow(input))
          .eq("id", id)
          .select("*")
          .maybeSingle<ArtistRow>();
        fail(error);
        // RLS filters out rows the user may not update, which surfaces as no row rather than an error.
        if (!data) throw new RepositoryError("Artist not found", "not_found");
        return toArtist(data);
      },
      async approve(id) {
        fail(
          (
            await client
              .from("artists")
              .update({ approved_at: new Date().toISOString() })
              .eq("id", id)
              .is("approved_at", null)
          ).error,
        );
      },
    },

    profileReviews: {
      async list() {
        const { data, error } = await client
          .from("artist_profile_reviews")
          .select(PROFILE_REVIEW_SELECT)
          .order("submitted_at");
        fail(error);
        return ((data ?? []) as unknown as ProfileReviewRow[]).map(toProfileReview);
      },
      async get(artistId) {
        const { data, error } = await client
          .from("artist_profile_reviews")
          .select(PROFILE_REVIEW_SELECT)
          .eq("artist_id", artistId)
          .maybeSingle();
        fail(error);
        return data ? toProfileReview(data as unknown as ProfileReviewRow) : null;
      },
      async submit(artistId, profile) {
        fail(
          (
            await client
              .from("artist_profile_reviews")
              .upsert({ artist_id: artistId, profile, submitted_at: new Date().toISOString() })
          ).error,
        );
      },
      async delete(artistId) {
        fail((await client.from("artist_profile_reviews").delete().eq("artist_id", artistId)).error);
      },
    },

    artworks: {
      async list(filters: ArtworkFilters = {}) {
        let query = client
          .from("artworks")
          .select(ARTWORK_SELECT)
          .order("created_at", { ascending: false });
        if (filters.artistId) query = query.eq("artist_id", filters.artistId);
        if (filters.category) query = query.eq("category", filters.category);
        if (filters.availability) query = query.eq("availability", filters.availability);
        if (filters.featured !== undefined) query = query.eq("featured", filters.featured);
        if (filters.limit) query = query.limit(filters.limit);
        const { data, error } = await query;
        fail(error);
        return ((data ?? []) as ArtworkRow[]).map(toArtwork);
      },
      async getBySlug(slug, artistId) {
        let query = client.from("artworks").select(ARTWORK_SELECT).eq("slug", slug);
        if (artistId) query = query.eq("artist_id", artistId);
        const { data, error } = await query.limit(1).maybeSingle<ArtworkRow>();
        fail(error);
        return data ? toArtwork(data) : null;
      },
      async getById(id) {
        const { data, error } = await client
          .from("artworks")
          .select(ARTWORK_SELECT)
          .eq("id", id)
          .maybeSingle<ArtworkRow>();
        fail(error);
        return data ? toArtwork(data) : null;
      },
      async create(artistId, input) {
        const { data, error } = await client
          .from("artworks")
          .insert({ ...toArtworkRow(input), artist_id: artistId })
          .select("id")
          .single<{ id: string }>();
        fail(error);
        if (!data) throw new RepositoryError("Failed to create artwork");
        await replaceImages(data.id, input.images);
        return getArtworkOrThrow(data.id);
      },
      async update(id, input) {
        fail((await client.from("artworks").update(toArtworkRow(input)).eq("id", id)).error);
        await replaceImages(id, input.images);
        return getArtworkOrThrow(id);
      },
      async setAvailability(id, availability) {
        fail((await client.from("artworks").update({ availability }).eq("id", id)).error);
      },
      async delete(id) {
        fail((await client.from("artworks").delete().eq("id", id)).error);
      },
    },

    inquiries: {
      async create(artistId, input) {
        // Anonymous visitors may insert but not read inquiries, so the id is generated here.
        const inquiry = {
          id: crypto.randomUUID(),
          artist_id: artistId,
          artwork_id: input.artworkId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject,
          message: input.message,
        };
        fail((await client.from("inquiries").insert(inquiry)).error);
        return {
          id: inquiry.id,
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
      },
      async list(artistId) {
        const { data, error } = await client
          .from("inquiries")
          .select("*, artworks(id, title, slug)")
          .eq("artist_id", artistId)
          .order("created_at", { ascending: false });
        fail(error);
        return ((data ?? []) as InquiryRow[]).map(
          (r): InquiryWithArtwork => ({
            id: r.id,
            artistId: r.artist_id,
            artworkId: r.artwork_id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            subject: r.subject,
            message: r.message,
            status: r.status,
            createdAt: r.created_at,
            artwork: r.artworks,
          }),
        );
      },
      async setStatus(id, status) {
        fail((await client.from("inquiries").update({ status }).eq("id", id)).error);
      },
      async delete(id) {
        fail((await client.from("inquiries").delete().eq("id", id)).error);
      },
    },

    applications: {
      async create(input: Omit<ApplicationInput, "company">) {
        // Applicants may insert but not read applications, so nothing is selected back.
        fail(
          (
            await client.from("artist_applications").insert({
              name: input.name,
              email: input.email,
              phone: input.phone,
              city: input.city,
              portfolio_url: input.portfolioUrl,
              sample_links: input.sampleLinks,
              mediums: input.mediums,
              statement: input.statement,
            })
          ).error,
        );
      },
      async list() {
        const { data, error } = await client
          .from("artist_applications")
          .select("*")
          .order("created_at", { ascending: false });
        fail(error);
        return ((data ?? []) as ApplicationRow[]).map(toApplication);
      },
      async update(id, { status, adminNote }) {
        const { data, error } = await client
          .from("artist_applications")
          .update({ status, admin_note: adminNote })
          .eq("id", id)
          .select("id");
        fail(error);
        if (!data?.length) throw new RepositoryError("Application not found", "not_found");
      },
      async delete(id) {
        fail((await client.from("artist_applications").delete().eq("id", id)).error);
      },
    },

    storage: {
      async uploadArtworkImage({ artistSlug, category, artworkSlug, file }) {
        const { bytes, extension, contentType } = await validateImageFile(file);
        const folder = CATEGORY_META[category].storageFolder;
        const objectPath = `${artistSlug}/${folder}/${buildImageFileName(category, artworkSlug, extension)}`;
        const bucket = client.storage.from(STORAGE_BUCKET);
        const { error } = await bucket.upload(objectPath, bytes, {
          contentType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new RepositoryError(error.message);
        return bucket.getPublicUrl(objectPath).data.publicUrl;
      },
      async uploadProfileImage({ artistSlug, file }) {
        const { bytes, extension, contentType } = await validateImageFile(file);
        const objectPath = `${artistSlug}/profile/${buildImageFileName("profile", artistSlug, extension)}`;
        const bucket = client.storage.from(STORAGE_BUCKET);
        const { error } = await bucket.upload(objectPath, bytes, {
          contentType,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new RepositoryError(error.message);
        return bucket.getPublicUrl(objectPath).data.publicUrl;
      },
    },
  };
}
