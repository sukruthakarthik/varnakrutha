import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Viewer links for Lab files: /lab-view/<token>/<folder>/<file>. The token grants read access to ONE
// folder until it expires, so an HTML page's own CSS, JavaScript and images (relative links in the same
// folder) load too, without relying on login cookies (a sandboxed page can't send them).

const LIFETIME_SECONDS = 2 * 60 * 60;

function secret(): string {
  const value = process.env.LAB_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Set LAB_LINK_SECRET (32+ random characters) to open Lab files.");
  }
  return value;
}

const sign = (folder: string, expires: number) =>
  createHmac("sha256", secret()).update(`lab|${folder}|${expires}`).digest("base64url").slice(0, 32);

/** The folder a Lab key lives in ("" for files at the bucket root). */
export function labFolderOf(key: string): string {
  const parts = key.split("/");
  return parts.length > 1 ? parts[0]! : "";
}

export function createLabToken(folder: string): string {
  const expires = Math.floor(Date.now() / 1000) + LIFETIME_SECONDS;
  return `${expires}.${sign(folder, expires)}`;
}

export function verifyLabToken(token: string, folder: string): boolean {
  const [exp, signature] = token.split(".");
  if (!exp || !signature || !/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(folder, Number(exp)));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
