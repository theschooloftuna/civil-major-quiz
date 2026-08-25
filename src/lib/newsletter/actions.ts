"use server";

import { isValidEmail } from "../email";
import { getSupabaseClient } from "../supabase/client";

export interface SubscribeNewsletterOutput {
  saved: boolean;
}

/**
 * Server Action behind the /newsletter form.
 *
 * Re-validates the address server-side because render-time validation is not
 * a security boundary — anyone can POST here directly, not just through the
 * form. Normalization itself is left to the database function, so it applies
 * to every caller rather than only to the ones that go through this file.
 *
 * Reports the same success for a new address and an address already on the
 * list: distinguishing them would make the form a way to test whether someone
 * is a subscriber.
 */
export async function subscribeToNewsletter(email: string): Promise<SubscribeNewsletterOutput> {
  if (!isValidEmail(email.trim())) {
    return { saved: false };
  }

  try {
    const { data, error } = await getSupabaseClient().rpc("subscribe_newsletter", {
      new_email: email,
    });

    return { saved: !error && data === true };
  } catch {
    // getSupabaseClient() throws on missing env vars - a deployment problem,
    // not something the visitor should see as a crash. Same contract as a
    // failed write: the caller shows an error and they can retry.
    return { saved: false };
  }
}

export interface UnsubscribeOutput {
  unsubscribed: boolean;
}

/**
 * Server Action behind the unsubscribe button. False means the token is
 * unknown; an already-unsubscribed token reports true, so a second click or
 * an email client re-fetching the link is harmless.
 */
export async function unsubscribeByToken(token: string): Promise<UnsubscribeOutput> {
  try {
    const { data, error } = await getSupabaseClient().rpc("unsubscribe_newsletter", {
      token,
    });

    return { unsubscribed: !error && data === true };
  } catch {
    return { unsubscribed: false };
  }
}
