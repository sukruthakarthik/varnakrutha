import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { isSupabase } from "@/lib/env";
import { RepositoryError } from "@/services/types";

// Admin-only study resources (Admin → Lab). Callers must check the user is a platform admin first.
// Supabase: the private "lab" bucket (RLS also limits it to platform admins). Mock: .data/lab, git-ignored.

const BUCKET = "lab";
const MOCK_DIR = path.join(process.cwd(), ".data", "lab");
/** Server actions on Vercel accept about 4.5 MB; bigger files go through the Supabase dashboard (see docs). */
export const LAB_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const LAB_UNSORTED = "general";

export interface LabFile {
  /** "<subject>/<file name>", the storage key. */
  path: string;
  subject: string;
  name: string;
  size: number | null;
  updatedAt: string | null;
}

/** "Science Experiments!" → "science-experiments". */
export function toSubjectFolder(subject: string): string {
  const folder = subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return folder || LAB_UNSORTED;
}

/** Keeps letters, numbers, dots, dashes and underscores; never a path. */
export function toSafeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "").slice(-120);
  return cleaned || "file";
}

/**
 * "<file>" or "<folder>/<file>", as stored in the bucket. Names uploaded through the Supabase dashboard may
 * contain spaces or capitals, so only path tricks are refused: "..", backslashes, leading slashes, deeper
 * nesting and control characters.
 */
export function isLabPath(value: string): boolean {
  const parts = value.split("/");
  return (
    value.length > 0 &&
    value.length <= 300 &&
    parts.length <= 2 &&
    parts.every((p) => p.length > 0 && p !== "." && p !== "..") &&
    !value.includes("\\") &&
    ![...value].some((c) => c.charCodeAt(0) < 32)
  );
}

/** Mock mode: the file's location under .data/lab, refusing anything that resolves outside it. */
function mockPath(key: string): string | null {
  const resolved = path.resolve(MOCK_DIR, ...key.split("/"));
  return resolved.startsWith(MOCK_DIR + path.sep) ? resolved : null;
}

async function supabaseBucket() {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  return (await createServerSupabaseClient()).storage.from(BUCKET);
}

export async function listLabFiles(): Promise<LabFile[]> {
  if (!isSupabase) {
    const files: LabFile[] = [];
    const folders = await fs.readdir(MOCK_DIR, { withFileTypes: true }).catch(() => []);
    for (const folder of folders.filter((f) => f.isDirectory())) {
      for (const name of await fs.readdir(path.join(MOCK_DIR, folder.name))) {
        const stat = await fs.stat(path.join(MOCK_DIR, folder.name, name));
        files.push({ path: `${folder.name}/${name}`, subject: folder.name, name, size: stat.size, updatedAt: stat.mtime.toISOString() });
      }
    }
    return files;
  }

  const bucket = await supabaseBucket();
  const { data: top, error } = await bucket.list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new RepositoryError(error.message);
  const files: LabFile[] = [];
  // Folders come back with no id; files uploaded straight to the bucket root are listed under "general".
  for (const entry of top ?? []) {
    if (entry.id) {
      files.push({ path: entry.name, subject: LAB_UNSORTED, name: entry.name, size: entry.metadata?.size ?? null, updatedAt: entry.updated_at ?? null });
      continue;
    }
    const { data: inner, error: innerError } = await bucket.list(entry.name, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (innerError) throw new RepositoryError(innerError.message);
    for (const file of inner ?? []) {
      // Supabase keeps a placeholder file in empty folders; skip it.
      if (!file.id || file.name === ".emptyFolderPlaceholder") continue;
      files.push({
        path: `${entry.name}/${file.name}`,
        subject: entry.name,
        name: file.name,
        size: file.metadata?.size ?? null,
        updatedAt: file.updated_at ?? null,
      });
    }
  }
  return files;
}

export async function uploadLabFile(subject: string, file: File): Promise<LabFile> {
  if (file.size === 0) throw new RepositoryError("That file is empty.", "invalid");
  if (file.size > LAB_MAX_UPLOAD_BYTES) {
    throw new RepositoryError("Files over 4 MB need to be uploaded through the Supabase dashboard (see the note on this page).", "invalid");
  }
  const folder = toSubjectFolder(subject);
  const name = toSafeFileName(file.name);
  const key = `${folder}/${name}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isSupabase) {
    // Re-uploading a file with the same name replaces it (handy when updating a page).
    await fs.mkdir(path.join(MOCK_DIR, folder), { recursive: true });
    await fs.writeFile(path.join(MOCK_DIR, folder, name), bytes);
  } else {
    const { error } = await (await supabaseBucket()).upload(key, bytes, {
      contentType: file.type || "application/octet-stream",
      // Re-uploading a file with the same name replaces it (handy when updating a page).
      upsert: true,
    });
    if (error) throw new RepositoryError(error.message);
  }
  return { path: key, subject: folder, name, size: file.size, updatedAt: new Date().toISOString() };
}

export async function deleteLabFile(key: string): Promise<void> {
  if (!isLabPath(key)) throw new RepositoryError("File not found", "not_found");
  if (!isSupabase) {
    const target = mockPath(key);
    if (target) await fs.rm(target, { force: true });
    return;
  }
  const { error } = await (await supabaseBucket()).remove([key]);
  if (error) throw new RepositoryError(error.message);
}

/**
 * The file's bytes, for the viewer route. That route authorises with a signed folder token rather than a
 * login cookie, so Supabase is read with the server-only service-role client.
 */
export async function readLabFile(key: string): Promise<Buffer | null> {
  if (!isLabPath(key)) return null;
  if (!isSupabase) {
    const target = mockPath(key);
    return target ? fs.readFile(target).catch(() => null) : null;
  }
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { data, error } = await createAdminSupabaseClient().storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
