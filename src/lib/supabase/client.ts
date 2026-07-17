import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client. Uses the anon key (never a service-role key)
 * so Postgres RLS remains the real enforcement boundary. Never import this
 * from a Client Component — the `server-only` import will fail the build.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. Set them in .env.local (see .env.example)."
    );
  }

  client = createClient(url, anonKey);
  return client;
}
