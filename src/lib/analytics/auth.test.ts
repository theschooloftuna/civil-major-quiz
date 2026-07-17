import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const cookieStore = new Map<string, string>();

const getMock = vi.fn((name: string) =>
  cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined
);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getMock }),
}));

const { ANALYTICS_SESSION_COOKIE, hasValidAnalyticsSession } = await import("./auth");
const { createSessionToken } = await import("./session");

describe("hasValidAnalyticsSession", () => {
  beforeEach(() => {
    cookieStore.clear();
    vi.stubEnv("ANALYTICS_PASSCODE", "correct-passcode");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns true for a valid, unexpired session cookie", async () => {
    const token = createSessionToken("correct-passcode", Date.now() + 1000);
    cookieStore.set(ANALYTICS_SESSION_COOKIE, token);

    expect(await hasValidAnalyticsSession()).toBe(true);
  });

  test("returns false when no session cookie is present", async () => {
    expect(await hasValidAnalyticsSession()).toBe(false);
  });

  test("returns false for an expired session cookie", async () => {
    const token = createSessionToken("correct-passcode", Date.now() - 1000);
    cookieStore.set(ANALYTICS_SESSION_COOKIE, token);

    expect(await hasValidAnalyticsSession()).toBe(false);
  });

  test("returns false when ANALYTICS_PASSCODE isn't configured, even with a cookie present", async () => {
    const token = createSessionToken("correct-passcode", Date.now() + 1000);
    cookieStore.set(ANALYTICS_SESSION_COOKIE, token);
    vi.unstubAllEnvs();

    expect(await hasValidAnalyticsSession()).toBe(false);
  });
});
