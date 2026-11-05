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
   * "invited": a new account; Supabase emailed an invitation to set a password.
   * "password-link": the email already had an account (often from an earlier attempt whose email failed);
   *   it is linked to the artist and Supabase emailed a link to set a password.
   * "temporary-password": mock mode; show `temporaryPassword` to the admin once, to pass on.
   */
  access: "invited" | "password-link" | "temporary-password";
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

/** Where the links in Supabase's emails land: /auth/confirm signs the artist in, then asks for a new password. */
const SET_PASSWORD_PATH = "/auth/confirm?next=/admin/set-password";

/**
 * Emails an existing login a link to set a password (Supabase's "Reset password" email). Used after accepting
 * when the email already had an account, and by Applications → "Send set-password email" to resend it.
 */
export async function sendSetPasswordEmail(email: string): Promise<void> {
  if (!isSupabase) {
    throw new RepositoryError("Emails are only sent with Supabase. In mock mode, pass on the temporary password instead.", "invalid");
  }
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { error } = await createAdminSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: absoluteUrl(SET_PASSWORD_PATH),
  });
  if (error) throw new RepositoryError(`Couldn't send the set-password email: ${error.message}`);
}

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
  const setPasswordUrl = absoluteUrl(SET_PASSWORD_PATH);

  // Safe to repeat: an earlier attempt may have created the login or the artist before failing,
  // so whatever already exists is reused, and the applicant is always emailed a link at the end.

  // 1. The login: invite a new user, or reuse the existing account for this email.
  let userId: string;
  let createdUser = false;
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: setPasswordUrl,
    data: { name: application.name },
  });
  if (!inviteError && invite.user) {
    userId = invite.user.id;
    createdUser = true;
  } else {
    // Usually "already registered". Supabase also keeps the account when the invitation email itself fails.
    const existing = await findUserIdByEmail(admin, email);
    if (!existing) {
      throw new RepositoryError(`Couldn't send the invitation email: ${inviteError?.message ?? "unknown error"}`);
    }
    userId = existing;
  }

  let createdArtistId: string | null = null;
  try {
    // 2. The artist: the one this login already manages, else a new one linked to it.
    const { data: membership, error: membershipError } = await admin
      .from("artist_admins")
      .select("artists(id, name, slug, approved_at)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle<{ artists: { id: string; name: string; slug: string; approved_at: string | null } | null }>();
    if (membershipError) throw new RepositoryError(membershipError.message);
    const managed = membership?.artists ?? null;
    let artist: { id: string; name: string; slug: string } | null = null;

    // An artist this login already manages is resumed only when it looks like an interrupted accept of this
    // application: never approved, and not created by another application. Anything else means the email
    // already has an artist account, and the admin should check the details rather than re-invite.
    if (managed) {
      const { data: owners, error: ownersError } = await admin
        .from("artist_applications")
        .select("id")
        .eq("artist_id", managed.id)
        .neq("id", application.id)
        .limit(1);
      if (ownersError) throw new RepositoryError(ownersError.message);
      if (managed.approved_at || owners?.length) {
        throw new RepositoryError(
          `An artist account already exists for ${email} (${managed.name}). Please verify the details: this looks like a repeat application, so decline or delete it instead.`,
          "conflict",
        );
      }
      artist = { id: managed.id, name: managed.name, slug: managed.slug };
    }

    if (!artist) {
      const { data: slugs, error: slugError } = await admin.from("artists").select("slug");
      if (slugError) throw new RepositoryError(slugError.message);
      const slug = uniqueSlug(application.name, (slugs ?? []).map((r: { slug: string }) => r.slug));

      const { data: created, error: artistError } = await admin
        .from("artists")
        .insert({ ...startingProfile(application), slug })
        .select("id, name, slug")
        .single<{ id: string; name: string; slug: string }>();
      if (artistError || !created) throw new RepositoryError(artistError?.message ?? "Couldn't create the artist");
      createdArtistId = created.id;

      const { error: memberError } = await admin.from("artist_admins").insert({ artist_id: created.id, user_id: userId });
      if (memberError) throw new RepositoryError(memberError.message);
      artist = created;
    }

    // 3. The email. A new user already got the invitation; an existing account gets a set-password link
    //    (the "Reset password" email), which also works if they never finished an earlier invitation.
    if (!createdUser) await sendSetPasswordEmail(email);
    return { artist, access: createdUser ? "invited" : "password-link" };
  } catch (error) {
    // Undo only what this attempt created, so it can simply be tried again.
    if (createdArtistId) await admin.from("artists").delete().eq("id", createdArtistId);
    if (createdUser) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

// ─── Mock ───────────────────────────────────────────────────────────

async function provisionMock(application: ArtistApplication): Promise<ProvisionedArtist> {
  const db = await getMockDb();
  const email = application.email.trim().toLowerCase();
  if (db.accounts.some((a) => a.email === email)) {
    throw new RepositoryError(
      `An artist account already exists for ${email}. Please verify the details: this looks like a repeat application, so decline or delete it instead.`,
      "conflict",
    );
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
