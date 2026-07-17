import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const SECRET = "test-secret";

describe("createSessionToken / verifySessionToken", () => {
  it("accepts a freshly created, unexpired token", () => {
    const now = Date.now();
    const token = createSessionToken(SECRET, now + 1000);
    expect(verifySessionToken(token, SECRET, now)).toBe(true);
  });

  it("rejects an expired token", () => {
    const now = Date.now();
    const token = createSessionToken(SECRET, now - 1);
    expect(verifySessionToken(token, SECRET, now)).toBe(false);
  });

  it("rejects a token right at its expiry instant", () => {
    const now = Date.now();
    const token = createSessionToken(SECRET, now);
    expect(verifySessionToken(token, SECRET, now)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const now = Date.now();
    const token = createSessionToken(SECRET, now + 1000);
    const [expiresAt, signature] = token.split(".");
    const tampered = `${expiresAt}.${signature.slice(0, -1)}${signature.at(-1) === "0" ? "1" : "0"}`;
    expect(verifySessionToken(tampered, SECRET, now)).toBe(false);
  });

  it("rejects a tampered expiry", () => {
    const now = Date.now();
    const token = createSessionToken(SECRET, now + 1000);
    const [, signature] = token.split(".");
    const tampered = `${now + 1_000_000}.${signature}`;
    expect(verifySessionToken(tampered, SECRET, now)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const now = Date.now();
    const token = createSessionToken("other-secret", now + 1000);
    expect(verifySessionToken(token, SECRET, now)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    const now = Date.now();
    expect(verifySessionToken("", SECRET, now)).toBe(false);
    expect(verifySessionToken("no-separator", SECRET, now)).toBe(false);
    expect(verifySessionToken("not-a-number.abcdef", SECRET, now)).toBe(false);
  });
});
