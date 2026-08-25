import { GRAPH_API_VERSION, GRAPH_HOST, type InstagramConfig } from "./config";

export interface PrivateReplyResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Sends a "private reply" - the DM you're allowed to send to someone who
 * commented on your media.
 *
 * Meta's limits: one private reply per comment, and it must be sent within 7
 * days of the comment. A second attempt on the same comment is rejected by
 * the API, which is the backstop behind our own dedupe.
 *
 * Never rejects. A network failure comes back as `ok: false` with status 0,
 * so the caller can log it and still answer Meta with a 200.
 */
export async function sendPrivateReply(
  config: InstagramConfig,
  commentId: string
): Promise<PrivateReplyResult> {
  const url = `${GRAPH_HOST}/${GRAPH_API_VERSION}/${config.accountId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: config.replyText },
      }),
    });

    const body = await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
}
