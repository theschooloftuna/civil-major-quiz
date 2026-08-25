import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin-client";

const TABLE = "ig_processed_comments";

/** Postgres unique-violation. Here it means "another delivery of this same
 * comment already claimed it", which is the whole point of the table. */
const UNIQUE_VIOLATION = "23505";

export type ClaimOutcome = "claimed" | "duplicate" | "unavailable";

/**
 * Attempts to claim a comment for replying. Returns `duplicate` if some other
 * delivery of the same webhook got there first.
 *
 * Claiming is an insert, not a read-then-write: two concurrent serverless
 * invocations both see an empty table, so only the primary key can settle it.
 *
 * On an infrastructure failure this returns `unavailable` and the caller
 * proceeds anyway (fail open). A bookkeeping table being down must not
 * silence the automation, and Meta's own one-reply-per-comment rule bounds
 * the damage to a rejected duplicate send.
 */
export async function claimComment(
  commentId: string,
  commenterId: string | undefined
): Promise<ClaimOutcome> {
  try {
    const { error } = await getSupabaseAdminClient()
      .from(TABLE)
      .insert({ comment_id: commentId, commenter_id: commenterId ?? null });

    if (!error) return "claimed";
    if (error.code === UNIQUE_VIOLATION) return "duplicate";

    console.error("[instagram] dedupe claim failed, proceeding anyway:", error.message);
    return "unavailable";
  } catch (error) {
    // getSupabaseAdminClient() throws when its env vars are missing.
    console.error("[instagram] dedupe store unavailable, proceeding anyway:", error);
    return "unavailable";
  }
}

/**
 * Drops a claim after a failed send, so Meta's next retry gets another go.
 * Without this, one transient 5xx from Meta would permanently swallow the DM.
 */
export async function releaseComment(commentId: string): Promise<void> {
  try {
    await getSupabaseAdminClient().from(TABLE).delete().eq("comment_id", commentId);
  } catch (error) {
    console.error("[instagram] failed to release dedupe claim:", error);
  }
}

/** Records the private-reply HTTP status on a successful send, so the table
 * doubles as an audit trail of what actually went out. */
export async function recordReplyStatus(commentId: string, status: number): Promise<void> {
  try {
    await getSupabaseAdminClient()
      .from(TABLE)
      .update({ reply_status: status })
      .eq("comment_id", commentId);
  } catch (error) {
    console.error("[instagram] failed to record reply status:", error);
  }
}
