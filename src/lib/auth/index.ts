import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabase } from "@/lib/env";
import { getCurrentArtist, getSessionDataSource } from "@/services";
import type { DataSource } from "@/services/types";
import type { Artist } from "@/types";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

export interface AdminContext {
  artist: Artist;
  dataSource: DataSource;
  email: string | null;
}

export async function getAdmin(): Promise<AdminContext | null> {
  const artist = await getCurrentArtist();

  if (!isSupabase) {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (!(await verifySessionToken(token))) return null;
    return { artist, dataSource: await getSessionDataSource(), email: null };
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  // Authorisation: the user must be an admin of this specific artist.
  const { data: membership } = await client
    .from("artist_admins")
    .select("artist_id")
    .eq("artist_id", artist.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return { artist, dataSource: await getSessionDataSource(), email: user.email ?? null };
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
