import "server-only";

import { getSupabaseAdminClient } from "./admin-client";

export type SubscriberStatus = "subscribed" | "unsubscribed";
export type SubscriberSource = "newsletter_page" | "quiz";

export interface SubscriberRow {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: SubscriberSource;
  /** When the row first appeared. The signup trend buckets on this, not on
   * subscribedAt, which moves on a re-subscribe and would report a returning
   * member as a brand-new signup. */
  createdAt: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

/**
 * Reads the newsletter list. Requires the admin client: migration 0007
 * revoked the anon and authenticated grants on this table, so the secret key
 * is the only path to it.
 */
export async function getSubscriberRows(): Promise<SubscriberRow[] | null> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("newsletter_subscribers")
      .select("id, email, status, source, created_at, subscribed_at, unsubscribed_at")
      .order("created_at", { ascending: false });

    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      subscribedAt: row.subscribed_at,
      unsubscribedAt: row.unsubscribed_at,
    }));
  } catch {
    // Missing env vars throw here; the page degrades to the config-error
    // state rather than crashing, same contract as getAnalyticsRows().
    return null;
  }
}
