import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { isSupabase } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";
import { getMockDb, persistMockDb } from "@/services/mock/store";
import { RepositoryError } from "@/services/types";
import type { Artist, ArtistApplication } from "@/types";
import { slugify } from "@/utils/format";

export interface ProvisionedArtist {
  artist: Pick<Artist, "id" | "name" | "slug">;
  /**
   * "invited": a new account; Supabase emailed a link to set a password.
   * "existing-account": the email already had an account, now linked to the artist; they sign in as usual.
   * "temporary-password": mock mode; show `temporaryPassword` to the admin once, to pass on.
   */
  access: "invited" | "existing-account" | "temporary-password";
  temporaryPassword?: string;
}

/** "naveen-kumar", then "naveen-kumar-2", ... */
function uniqueSlug(name: string, taken: Iterable<string>): string {
  const base = slugify(name) || "artist";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Starting profile from the application; the artist edits it, and an admin approves it before it is public. */
function startingProfile(application: ArtistApplication) {
  const isInstagram = /(^|\.)instagram\.com\//i.test(application.portfolioUrl.replace(/^https?:\/\//, ""));
  return {
    name: application.name,
    bio: application.statement,
    instagram: isInstagram ? application.portfolioUrl : null,
    website: isInstagram ? null : application.portfolioUrl,
  };
}

/**
 * Creates the artist for an accepted application and gives the applicant a login that manages only that artist.
 * The artist stays hidden from guests until an admin approves their profile.
 */
export async function provisionArtistAccount(application: ArtistApplication): Promise<ProvisionedArtist> {
  return isSupabase ? provisionWithSupabase(application) : provisionMock(application);
}

// ─── Supabase ───────────────────────────────────────────────────────

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new RepositoryError(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function provisionWithSupabase(application: ArtistApplication): Promise<ProvisionedArtist> {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const email = application.email.trim().toLowerCase();

  // 1. The login: invite a new user, or reuse an existing one that isn't already an artist.
  let userId: string;
  let invited = false;
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: absoluteUrl("/auth/confirm?next=/admin/set-password"),
    data: { name: application.name },
  });
  if (!inviteError && invite.user) {
    userId = invite.user.id;
    invited = true;
  } else if (inviteError && ((inviteError.code as string | undefined) === "email_exists" || /already/i.test(inviteError.message))) {
    const existing = await findUserIdByEmail(admin, email);
    if (!existing) throw new RepositoryError(`Couldn't find the existing account for ${email}.`);
    const { count } = await admin
      .from("artist_admins")
      .select("artist_id", { count: "exact", head: true })
      .eq("user_id", existing);
    if (count) throw new RepositoryError(`${email} already manages an artist on this site.`, "conflict");
    userId = existing;
  } else {
    throw new RepositoryError(`Couldn't send the invitation email: ${inviteError?.message ?? "unknown error"}`);
  }

  // 2. The artist, and 3. the membership that makes the user its artist. Undo everything if a step fails.
  try {
    const { data: slugs, error: slugError } = await admin.from("artists").select("slug");
    if (slugError) throw new RepositoryError(slugError.message);
    const slug = uniqueSlug(application.name, (slugs ?? []).map((r: { slug: string }) => r.slug));

    const { data: artist, error: artistError } = await admin
      .from("artists")
      .insert({ ...startingProfile(application), slug })
      .select("id, name, slug")
      .single<{ id: string; name: string; slug: string }>();
    if (artistError || !artist) throw new RepositoryError(artistError?.message ?? "Couldn't create the artist");

    const { error: memberError } = await admin.from("artist_admins").insert({ artist_id: artist.id, user_id: userId });
    if (memberError) {
      await admin.from("artists").delete().eq("id", artist.id);
      throw new RepositoryError(memberError.message);
    }
    return { artist, access: invited ? "invited" : "existing-account" };
  } catch (error) {
    if (invited) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

// ─── Mock ───────────────────────────────────────────────────────────

async function provisionMock(application: ArtistApplication): Promise<ProvisionedArtist> {
  const db = await getMockDb();
  const email = application.email.trim().toLowerCase();
  if (db.accounts.some((a) => a.email === email)) {
    throw new RepositoryError(`${email} already manages an artist on this site.`, "conflict");
  }

  const now = new Date().toISOString();
  const artist: Artist = {
    id: crypto.randomUUID(),
    slug: uniqueSlug(application.name, db.artists.map((a) => a.slug)),
    tagline: null,
    heroLayout: "wide",
    profileImage: null,
    youtube: null,
    facebook: null,
    pinterest: null,
    journey: [],
    inspiration: [],
    skills: [],
    techniques: [],
    approvedAt: null,
    createdAt: now,
    ...startingProfile(application),
  };
  const temporaryPassword = generateTemporaryPassword();

  db.artists.push(artist);
  db.accounts.push({ email, passwordHash: await hashPassword(temporaryPassword), artistId: artist.id, createdAt: now });
  await persistMockDb(db);
  return { artist, access: "temporary-password", temporaryPassword };
}

/** Mock-mode artist sign-in; returns the artist the account manages, or null. */
export async function verifyMockArtistLogin(email: string, password: string): Promise<string | null> {
  const db = await getMockDb();
  const account = db.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!account || !(await verifyPassword(password, account.passwordHash))) return null;
  return db.artists.some((a) => a.id === account.artistId) ? account.artistId : null;
}
