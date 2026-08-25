import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { safeEqual, verifyWebhookSignature } from "./signature";

const SECRET = "app-secret";
// Spaced exactly the way a real delivery arrives - a JSON round-trip
// would collapse that whitespace, which is what the test below relies on.
const BODY = '{"object": "instagram", "entry": [{"id": "1"}]}';

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a signature computed over the exact raw body", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a body that was re-serialized after parsing", () => {
    // The whole reason the handler reads request.text() before JSON.parse:
    // a round-trip through JSON changes the bytes and invalidates the HMAC.
    const reserialized = JSON.stringify(JSON.parse(BODY));
    expect(reserialized).not.toBe(BODY);
    expect(verifyWebhookSignature(reserialized, sign(BODY), SECRET)).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, "wrong-secret"), SECRET)).toBe(false);
  });

  it("rejects a tampered signature of the correct length", () => {
    const signature = sign(BODY);
    const last = signature.at(-1);
    const tampered = `${signature.slice(0, -1)}${last === "0" ? "1" : "0"}`;
    expect(verifyWebhookSignature(BODY, tampered, SECRET)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", () => {
    const bare = sign(BODY).slice("sha256=".length);
    expect(verifyWebhookSignature(BODY, bare, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, `sha1=${bare}`, SECRET)).toBe(false);
  });

  it("rejects truncated and non-hex signatures without throwing", () => {
    expect(verifyWebhookSignature(BODY, "sha256=abcd", SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "sha256=zzzz", SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "sha256=", SECRET)).toBe(false);
  });

  it("accepts an empty body signed as an empty body", () => {
    expect(verifyWebhookSignature("", sign(""), SECRET)).toBe(true);
  });
});

describe("safeEqual", () => {
  it("is true only for identical strings", () => {
    expect(safeEqual("verify-token", "verify-token")).toBe(true);
    expect(safeEqual("verify-token", "verify-toke")).toBe(false);
    expect(safeEqual("verify-token", "Verify-token")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("returns false rather than throwing on a length mismatch", () => {
    expect(safeEqual("short", "a-much-longer-value")).toBe(false);
  });
});
