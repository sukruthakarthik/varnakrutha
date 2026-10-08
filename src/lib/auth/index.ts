import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isSupabase } from "@/lib/env";
import { getCurrentArtist, getSessionDataSource } from "@/services";
import type { DataSource } from "@/services/types";
import type { Artist } from "@/types";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

export interface AdminContext {
  artist: Artist;
  dataSource: DataSource;
  email: string | null;
  /** May review and approve every artist's profile. */
  isPlatformAdmin: boolean;
}

export async function getAdmin(): Promise<AdminContext | null> {
  const artist = await getCurrentArtist();

  if (!isSupabase) {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!(await verifySessionToken(token))) return null;
    // Local mock mode has a single admin, who owns the site.
    return { artist, dataSource: await getSessionDataSource(), email: null, isPlatformAdmin: true };
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  // Authorisation: the user must be an admin of this specific artist.
  const [{ data: membership }, { data: platformAdmin }] = await Promise.all([
    client
      .from("artist_admins")
      .select("artist_id")
      .eq("artist_id", artist.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    client.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!membership) return null;

  return {
    artist,
    dataSource: await getSessionDataSource(),
    email: user.email ?? null,
    isPlatformAdmin: Boolean(platformAdmin),
  };
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

/** For pages only platform admins may see; other admins get a 404. */
export async function requirePlatformAdminPage(): Promise<AdminContext> {
  const admin = await requireAdminPage();
  if (!admin.isPlatformAdmin) notFound();
  return admin;
}

/** For server actions only platform admins may run. */
export async function requirePlatformAdminAction(): Promise<AdminContext> {
  const admin = await requireAdminAction();
  if (!admin.isPlatformAdmin) throw new Error("Unauthorized");
  return admin;
}
