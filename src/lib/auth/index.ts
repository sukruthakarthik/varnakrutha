import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isSupabase } from "@/lib/env";
import { siteConfig } from "@/lib/site";
import { getCurrentArtist, getSessionDataSource } from "@/services";
import type { DataSource } from "@/services/types";
import type { Artist } from "@/types";
import type { Role } from "./roles";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

export type { Role } from "./roles";

export interface AdminContext {
  /** The artist whose artworks and profile this user manages. */
  artist: Artist;
  dataSource: DataSource;
  email: string | null;
  role: Role;
  /** Shorthand for `role === "admin"`. */
  isPlatformAdmin: boolean;
}

export async function getAdmin(): Promise<AdminContext | null> {
  if (!isSupabase) {
    const claims = await verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
    if (!claims) return null;
    const dataSource = await getSessionDataSource();
    // The mock admin owns the site's own artist; mock artists sign in to the artist they were created for.
    const artist = claims.artistId ? await dataSource.artists.getById(claims.artistId) : await getCurrentArtist();
    if (!artist) return null;
    return { artist, dataSource, email: null, role: claims.role, isPlatformAdmin: claims.role === "admin" };
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
    client.from("artist_admins").select("artist_id, artists(slug)").eq("user_id", user.id),
    client.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const role: Role = platformAdmin ? "admin" : "artist";

  // Prefer the site's own artist when the user manages several (the owner usually does).
  const rows = (memberships ?? []) as unknown as { artist_id: string; artists: { slug: string } | null }[];
  const membership = rows.find((m) => m.artists?.slug === siteConfig.defaultArtistSlug) ?? rows[0];

  const dataSource = await getSessionDataSource();
  let artist: Artist | null = null;
  if (membership) artist = await dataSource.artists.getById(membership.artist_id);
  else if (role === "admin") artist = await getCurrentArtist();
  // Signed in, but not linked to any artist: no access.
  if (!artist) return null;

  return { artist, dataSource, email: user.email ?? null, role, isPlatformAdmin: role === "admin" };
}

/** For admin pages: redirects to the login screen when unauthenticated. */
export async function requireAdminPage(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For admin server actions: throws when unauthenticated. */
export async function requireAdminAction(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

/** For pages only admins may see; artists get a 404. */
export async function requirePlatformAdminPage(): Promise<AdminContext> {
  const admin = await requireAdminPage();
  if (!admin.isPlatformAdmin) notFound();
  return admin;
}

/** For server actions only admins may run. */
export async function requirePlatformAdminAction(): Promise<AdminContext> {
  const admin = await requireAdminAction();
  if (!admin.isPlatformAdmin) throw new Error("Unauthorized");
  return admin;
}
