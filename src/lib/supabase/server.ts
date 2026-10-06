import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/lib/env";

/** Cookie-less client for public reads, safe for statically rendered pages. */
export function createPublicSupabaseClient(): SupabaseClient {
  const { url, anonKey } = requireSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Session-aware client so Row Level Security sees the signed-in admin. */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only; middleware refreshes them.
        }
      },
    },
  });
}
