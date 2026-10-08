import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_META, STORAGE_BUCKET } from "@/lib/constants";
import type { ArtistProfileInput } from "@/features/artists/schemas";
import type { ArtworkInput } from "@/features/artworks/schemas";
import { buildImageFileName, validateImageFile } from "@/services/image-validation";
import { RepositoryError, type ArtworkFilters, type DataSource } from "@/services/types";
import type {
  Artist,
  ArtistTechnique,
  Artwork,
  Availability,
  Category,
  InquiryStatus,
  InquiryWithArtwork,
} from "@/types";

interface ArtistRow {
  id: string;
  name: string;
  slug: string;
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
  created_at: string;
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
  createdAt: r.created_at,
});

const toArtistProfileRow = (input: ArtistProfileInput) => ({
  name: input.name,
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
