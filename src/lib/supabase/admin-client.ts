import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client using the secret key. Bypasses Row Level
 * Security entirely, so it must never be used for anything the quiz
 * itself does — only for the passcode-gated /analytics dashboard, which
 * needs to read columns (like `email`) the anon/publishable key
 * structurally cannot see. Never import this from a Client Component.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables. Set them in .env.local (see .env.example)."
    );
  }

  client = createClient(url, secretKey);
  return client;
}
