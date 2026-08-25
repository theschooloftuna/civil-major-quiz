/**
 * Instagram API with **Instagram Login** (not the Facebook Login path).
 * That choice determines the host and the shape of the account id below -
 * see `instagram-dm-automation.md` for the debugging history.
 */
export const GRAPH_HOST = "https://graph.instagram.com";
export const GRAPH_API_VERSION = "v25.0";

export interface InstagramConfig {
  accessToken: string;
  /**
   * The `id` returned by `/me`, NOT the `17841...` `user_id`. The latter
   * belongs to the Facebook-login path and fails with "Object with ID does
   * not exist" (code 100, subcode 33) on this setup.
   */
  accountId: string;
  triggerWord: string;
  replyText: string;
  /** Testing escape hatch: lets the owner trigger the bot from their own
   * account. Off unless explicitly set, so the bot never answers itself. */
  allowSelfComments: boolean;
}

export type InstagramConfigResult =
  | { ok: true; config: InstagramConfig }
  | { ok: false; missing: string[] };

/**
 * Reads and trims an env var. The trim matters: hosting platforms' env-var
 * UIs (unlike dotenv-style local parsing) don't strip a pasted trailing
 * newline, which would otherwise break token and passcode comparisons in
 * production only. Same reasoning as `lib/analytics/auth.ts`.
 */
export function readInstagramEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw ? raw : undefined;
}

/**
 * Turns the two-character sequence `\n` into a real newline.
 *
 * Env vars are single-line by nature, and the two places this app reads them
 * from disagree about escapes: dotenv expands `\n` inside a quoted value,
 * while a hosting platform's env-var UI stores the literal characters. Doing
 * the expansion here means one single-line value behaves the same locally and
 * in production, instead of a DM going out with a visible backslash in it.
 */
function unescapeNewlines(value: string): string {
  return value.replace(/\\n/g, "\n");
}

/** Meta's webhook verification token. Only the GET handshake needs this, so
 * it's read separately - the handshake must work before the send-side vars
 * are filled in. */
export function getVerifyToken(): string | undefined {
  return readInstagramEnv("IG_VERIFY_TOKEN");
}

/** The app secret enables `X-Hub-Signature-256` verification. Optional by
 * design: the flow can be brought up unsigned (as the Flask prototype was)
 * and hardened by setting this var, with no code change. */
export function getAppSecret(): string | undefined {
  return readInstagramEnv("IG_APP_SECRET");
}

export function getInstagramConfig(): InstagramConfigResult {
  const accessToken = readInstagramEnv("IG_ACCESS_TOKEN");
  const accountId = readInstagramEnv("IG_ACCOUNT_ID");
  const triggerWord = readInstagramEnv("IG_TRIGGER_WORD");
  const replyText = readInstagramEnv("IG_REPLY_TEXT");

  const missing: string[] = [];
  if (!accessToken) missing.push("IG_ACCESS_TOKEN");
  if (!accountId) missing.push("IG_ACCOUNT_ID");
  if (!triggerWord) missing.push("IG_TRIGGER_WORD");
  if (!replyText) missing.push("IG_REPLY_TEXT");

  if (!accessToken || !accountId || !triggerWord || !replyText) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    config: {
      accessToken,
      accountId,
      triggerWord,
      replyText: unescapeNewlines(replyText),
      allowSelfComments: readInstagramEnv("IG_ALLOW_SELF_COMMENTS") === "true",
    },
  };
}
