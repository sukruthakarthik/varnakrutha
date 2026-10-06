import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { seedArtists, seedArtworks } from "@/data/seed";
import type { Artist, Artwork, Inquiry } from "@/types";

export interface MockDb {
  artists: Artist[];
  artworks: Artwork[];
  inquiries: Inquiry[];
}

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "db.json");

// Survives dev hot-reloads so edits made in the admin aren't lost between requests.
const globalStore = globalThis as unknown as {
  __mockDb?: Promise<MockDb>;
  __mockDbWrite?: Promise<void>;
  __mockDbWarned?: boolean;
};

async function load(): Promise<MockDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as MockDb;
  } catch {
    return structuredClone({ artists: seedArtists, artworks: seedArtworks, inquiries: [] });
  }
}

export function getMockDb(): Promise<MockDb> {
  globalStore.__mockDb ??= load();
  return globalStore.__mockDb;
}

export function persistMockDb(db: MockDb): Promise<void> {
  const previous = globalStore.__mockDbWrite ?? Promise.resolve();
  globalStore.__mockDbWrite = previous.then(async () => {
    try {
      await fs.mkdir(DB_DIR, { recursive: true });
      const tmp = `${DB_PATH}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
      await fs.rename(tmp, DB_PATH);
    } catch (error) {
      // Read-only filesystems (e.g. Vercel) keep changes in memory only.
      if (!globalStore.__mockDbWarned) {
        globalStore.__mockDbWarned = true;
        console.warn("[mock-db] Could not persist to disk; changes are in-memory only.", error);
      }
    }
  });
  return globalStore.__mockDbWrite;
}
