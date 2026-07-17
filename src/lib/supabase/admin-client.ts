import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client using the service-role key. Bypasses Row
 * Level Security entirely, so it must never be used for anything the quiz
 * itself does — only for the passcode-gated /analytics dashboard, which
 * needs to read columns (like `email`) the anon key structurally cannot
 * see. Never import this from a Client Component.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. Set them in .env.local (see .env.example)."
    );
  }

  client = createClient(url, serviceRoleKey);
  return client;
}
