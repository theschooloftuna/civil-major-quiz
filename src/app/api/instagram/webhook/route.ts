import { after } from "next/server";

import { getAppSecret, getInstagramConfig, getVerifyToken } from "@/lib/instagram/config";
import { extractCommentEvents } from "@/lib/instagram/payload";
import { processCommentEvents } from "@/lib/instagram/process";
import { safeEqual, verifyWebhookSignature } from "@/lib/instagram/signature";

/**
 * Instagram comment -> auto-DM webhook.
 *
 * GET  - Meta's one-time verification handshake when the callback URL is saved.
 * POST - comment events. Answers 200 for anything that clears the signature
 *        gate, including garbage, because a non-200 makes Meta retry.
 *
 * Meta only delivers *real* comment events while the app is Live/Published.
 * The Test button works in Development mode too, so a green Test button is
 * not proof of real delivery - see `instagram-dm-automation.md`.
 */

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = getVerifyToken();
  if (!verifyToken) {
    console.error("[instagram] IG_VERIFY_TOKEN is not set; rejecting verification.");
    return textResponse("Forbidden", 403);
  }

  if (mode !== "subscribe" || !token || !challenge || !safeEqual(token, verifyToken)) {
    return textResponse("Forbidden", 403);
  }

  // Must be plain text, not JSON - Meta compares the body byte-for-byte
  // against the challenge it sent.
  return textResponse(challenge, 200);
}

export async function POST(request: Request): Promise<Response> {
  // Raw body first. `request.json()` consumes the stream and reparsing it
  // changes the bytes, which breaks the HMAC below.
  const rawBody = await request.text();

  const appSecret = getAppSecret();
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      console.warn("[instagram] rejected a webhook with an invalid signature.");
      return textResponse("Forbidden", 403);
    }
  } else {
    console.warn(
      "[instagram] IG_APP_SECRET is not set - webhook signatures are NOT being verified."
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.warn("[instagram] ignoring a webhook with an unparseable body.");
    return Response.json({ received: 0 }, { status: 200 });
  }

  const events = extractCommentEvents(body);
  console.log(`[instagram] webhook received: ${events.length} comment event(s).`);

  if (events.length > 0) {
    const config = getInstagramConfig();
    if (config.ok) {
      // Ack first, send after. Meta retries anything it doesn't see acked
      // quickly, and `after` is the supported way to keep a serverless
      // invocation alive past the response.
      after(() => processCommentEvents(events, config.config));
    } else {
      console.error(
        `[instagram] not replying - missing env vars: ${config.missing.join(", ")}`
      );
    }
  }

  return Response.json({ received: events.length }, { status: 200 });
}
