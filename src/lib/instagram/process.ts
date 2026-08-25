import type { InstagramConfig } from "./config";
import { claimComment, recordReplyStatus, releaseComment } from "./dedupe";
import { matchesTrigger, type CommentEvent } from "./payload";
import { sendPrivateReply } from "./private-reply";

export type ProcessOutcome =
  | "replied"
  | "reply-failed"
  | "no-match"
  | "self-comment"
  | "duplicate";

export interface ProcessResult {
  commentId: string;
  outcome: ProcessOutcome;
}

async function processCommentEvent(
  event: CommentEvent,
  config: InstagramConfig
): Promise<ProcessResult> {
  // Guard first, before anything is written or sent: without it the bot
  // answers its own comments. Disabled only via IG_ALLOW_SELF_COMMENTS, which
  // exists so the owner can test the flow from their own account.
  if (!config.allowSelfComments && event.fromId === config.accountId) {
    return { commentId: event.commentId, outcome: "self-comment" };
  }

  // Matching is free and side-effect-free, so it runs before the claim -
  // that keeps every non-triggering comment on the account out of the table.
  if (!matchesTrigger(event.text, config.triggerWord)) {
    return { commentId: event.commentId, outcome: "no-match" };
  }

  const claim = await claimComment(event.commentId, event.fromId);
  if (claim === "duplicate") {
    return { commentId: event.commentId, outcome: "duplicate" };
  }

  const reply = await sendPrivateReply(config, event.commentId);

  if (!reply.ok) {
    console.error(
      `[instagram] private reply failed for ${event.commentId}: ${reply.status} ${reply.body}`
    );
    if (claim === "claimed") await releaseComment(event.commentId);
    return { commentId: event.commentId, outcome: "reply-failed" };
  }

  console.log(`[instagram] private reply sent for ${event.commentId}: ${reply.status}`);
  if (claim === "claimed") await recordReplyStatus(event.commentId, reply.status);
  return { commentId: event.commentId, outcome: "replied" };
}

/**
 * Runs every comment event to completion. One event failing must not abort
 * its siblings - a single webhook delivery can carry several changes, and
 * they're unrelated to each other.
 */
export async function processCommentEvents(
  events: CommentEvent[],
  config: InstagramConfig
): Promise<ProcessResult[]> {
  const results = await Promise.all(
    events.map(async (event) => {
      try {
        return await processCommentEvent(event, config);
      } catch (error) {
        console.error(`[instagram] error processing ${event.commentId}:`, error);
        return { commentId: event.commentId, outcome: "reply-failed" as const };
      }
    })
  );

  return results;
}
