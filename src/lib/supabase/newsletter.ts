import "server-only";

import { getSupabaseClient } from "./client";

/**
 * Whether an unsubscribe token corresponds to a real subscriber.
 *
 * Deliberately returns only a boolean. The unsubscribe page needs to choose
 * between showing the button and showing an invalid-link state, and that is
 * the only thing it is entitled to know — never the address behind the token.
 */
export async function newsletterTokenExists(token: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseClient().rpc("newsletter_token_exists", {
      token,
    });

    return !error && data === true;
  } catch {
    // getSupabaseClient() throws when env vars are missing/misconfigured.
    // That's a deployment problem, and it should degrade to the same
    // invalid-link state as an unknown token rather than crashing the route.
    return false;
  }
}
