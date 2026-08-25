import { createHmac, timingSafeEqual } from "crypto";

const PREFIX = "sha256=";

/**
 * Verifies Meta's `X-Hub-Signature-256` header.
 *
 * `rawBody` must be the exact bytes Meta sent - the string from
 * `request.text()`, never a re-serialized parse. `JSON.parse` followed by
 * `JSON.stringify` reorders nothing but does normalize whitespace, which is
 * enough to break the HMAC.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string
): boolean {
  if (!header || !header.startsWith(PREFIX)) return false;

  const provided = header.slice(PREFIX.length);
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  // timingSafeEqual throws on a length mismatch, and Buffer.from() silently
  // truncates non-hex input, so the length guard has to come first.
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Constant-time string comparison for the verification-handshake token. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
