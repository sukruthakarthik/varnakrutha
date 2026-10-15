// Edge-compatible (Web Crypto only) so middleware can verify sessions.

export const ADMIN_COOKIE = "abs_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type SessionRole = "admin" | "artist";

export interface SessionClaims {
  role: SessionRole;
  /** The artist an "artist" session manages; null for the site admin. */
  artistId: string | null;
}

// Token: <role>.<artistId or "-">.<expiresAt>.<signature>. UUIDs contain no dots, so splitting is safe.
export async function createSessionToken(secret: string, claims: SessionClaims): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${claims.role}.${claims.artistId ?? "-"}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionClaims | null> {
  const secret = getSessionSecret();
  if (!token || !secret) return null;
  const [role, artistId, exp, sig, ...rest] = token.split(".");
  if (rest.length || !artistId || !exp || !sig) return null;
  if (role !== "admin" && role !== "artist") return null;
  if (role === "artist" && artistId === "-") return null;
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return null;
  const signature = fromBase64Url(sig);
  if (!signature) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signature,
    encoder.encode(`${role}.${artistId}.${exp}`),
  );
  return valid ? { role, artistId: artistId === "-" ? null : artistId } : null;
}
