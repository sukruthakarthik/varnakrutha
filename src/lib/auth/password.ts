import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Only used for mock-mode artist accounts; Supabase stores and checks real passwords itself.

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** Returns "scrypt$<salt>$<hash>" (both base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** A readable one-time password, e.g. "plum-river-4821-lotus". */
export function generateTemporaryPassword(): string {
  const words = ["lotus", "river", "amber", "plum", "cedar", "indigo", "saffron", "monsoon", "temple", "ochre", "jade", "ember"];
  const pick = () => words[randomBytes(1)[0]! % words.length];
  const digits = (randomBytes(2).readUInt16BE(0) % 9000) + 1000;
  return `${pick()}-${pick()}-${digits}-${pick()}`;
}
