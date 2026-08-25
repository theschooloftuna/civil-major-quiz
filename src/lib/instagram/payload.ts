/**
 * A single comment event lifted out of Meta's webhook envelope. Everything
 * downstream works with this, not the raw payload.
 */
export interface CommentEvent {
  commentId: string;
  text: string;
  fromId?: string;
  fromUsername?: string;
  mediaId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Pulls comment events out of a webhook body. Total function: any shape that
 * isn't the expected envelope yields `[]` rather than throwing, because the
 * handler must answer 200 no matter what Meta posts at it.
 *
 * Expected shape (confirmed against a real delivery):
 *   { entry: [ { changes: [ { field: "comments", value: {
 *       id, text, from: { id, username }, media: { id } } } ] } ] }
 */
export function extractCommentEvents(body: unknown): CommentEvent[] {
  if (!isRecord(body)) return [];

  const entries = body.entry;
  if (!Array.isArray(entries)) return [];

  const events: CommentEvent[] = [];

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const changes = entry.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!isRecord(change)) continue;
      // Other subscribed fields (mentions, live_comments, ...) may show up
      // later; this route only speaks `comments`.
      if (change.field !== "comments") continue;

      const value = change.value;
      if (!isRecord(value)) continue;

      const commentId = readString(value, "id");
      const text = readString(value, "text");
      if (!commentId || !text) continue;

      const from = isRecord(value.from) ? value.from : undefined;
      const media = isRecord(value.media) ? value.media : undefined;

      events.push({
        commentId,
        text,
        fromId: from ? readString(from, "id") : undefined,
        fromUsername: from ? readString(from, "username") : undefined,
        mediaId: media ? readString(media, "id") : undefined,
      });
    }
  }

  return events;
}

/**
 * Case-insensitive substring test, matching the verified prototype. This
 * deliberately has no word boundaries: trigger `country` also matches
 * "countryside". Accepted behavior, not a bug - people comment messily and a
 * missed DM is worse than a loose one.
 */
export function matchesTrigger(text: string, triggerWord: string): boolean {
  const needle = triggerWord.trim().toLowerCase();
  if (!needle) return false;
  return text.toLowerCase().includes(needle);
}
