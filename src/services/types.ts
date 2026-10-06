import type { ArtworkInput } from "@/features/artworks/schemas";
import type { InquiryInput } from "@/features/inquiries/schemas";
import type {
  Artist,
  Artwork,
  Availability,
  Category,
  Inquiry,
  InquiryStatus,
  InquiryWithArtwork,
} from "@/types";

export interface ArtworkFilters {
  artistId?: string;
  category?: Category;
  availability?: Availability;
  featured?: boolean;
  limit?: number;
}

export interface ArtistRepository {
  list(): Promise<Artist[]>;
  getBySlug(slug: string): Promise<Artist | null>;
}

export interface ArtworkRepository {
  list(filters?: ArtworkFilters): Promise<Artwork[]>;
  getBySlug(slug: string, artistId?: string): Promise<Artwork | null>;
  getById(id: string): Promise<Artwork | null>;
  create(artistId: string, input: ArtworkInput): Promise<Artwork>;
  update(id: string, input: ArtworkInput): Promise<Artwork>;
  setAvailability(id: string, availability: Availability): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface InquiryRepository {
  create(artistId: string, input: Omit<InquiryInput, "company">): Promise<Inquiry>;
  list(artistId: string): Promise<InquiryWithArtwork[]>;
  setStatus(id: string, status: InquiryStatus): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface UploadImageParams {
  artistSlug: string;
  category: Category;
  artworkSlug: string;
  file: File;
}

export interface StorageService {
  /** Returns a publicly accessible URL for the uploaded image. */
  uploadArtworkImage(params: UploadImageParams): Promise<string>;
}

export interface DataSource {
  artists: ArtistRepository;
  artworks: ArtworkRepository;
  inquiries: InquiryRepository;
  storage: StorageService;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "conflict" | "invalid" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
