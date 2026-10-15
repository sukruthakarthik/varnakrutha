import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";
import { RepositoryError } from "@/services/types";

/**
 * Service-role client: bypasses Row Level Security and can create users.
 * Only for trusted server code that has already checked the caller is a platform admin.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const { url } = requireSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new RepositoryError(
      "Creating artist accounts needs SUPABASE_SERVICE_ROLE_KEY. Add it to the server environment (never as NEXT_PUBLIC_).",
      "invalid",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
