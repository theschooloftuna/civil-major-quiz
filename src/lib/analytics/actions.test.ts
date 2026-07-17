import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

interface StoredCookie {
  value: string;
}

const cookieStore = new Map<string, StoredCookie>();

const getMock = vi.fn((name: string) =>
  cookieStore.has(name) ? { name, value: cookieStore.get(name)!.value } : undefined
);
const setMock = vi.fn((name: string, value: string) => {
  cookieStore.set(name, { value });
});
const deleteMock = vi.fn((arg: string | { name: string }) => {
  cookieStore.delete(typeof arg === "string" ? arg : arg.name);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getMock, set: setMock, delete: deleteMock }),
}));

const { loginToAnalytics, logoutFromAnalytics } = await import("./actions");
const { ANALYTICS_SESSION_COOKIE } = await import("./auth");

describe("loginToAnalytics", () => {
  beforeEach(() => {
    cookieStore.clear();
    getMock.mockClear();
    setMock.mockClear();
    vi.stubEnv("ANALYTICS_PASSCODE", "correct-passcode");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("sets a session cookie and reports success on the correct passcode", async () => {
    const result = await loginToAnalytics("correct-passcode");

    expect(result).toEqual({ success: true });
    expect(cookieStore.has(ANALYTICS_SESSION_COOKIE)).toBe(true);
  });

  test("reports failure and sets no cookie on an incorrect passcode", async () => {
    const result = await loginToAnalytics("wrong-passcode");

    expect(result).toEqual({ success: false });
    expect(cookieStore.has(ANALYTICS_SESSION_COOKIE)).toBe(false);
  });

  test("reports failure without setting a cookie when ANALYTICS_PASSCODE isn't configured", async () => {
    vi.unstubAllEnvs();
    const result = await loginToAnalytics("anything");

    expect(result).toEqual({ success: false });
    expect(cookieStore.has(ANALYTICS_SESSION_COOKIE)).toBe(false);
  });
});

describe("logoutFromAnalytics", () => {
  test("deletes the session cookie", async () => {
    cookieStore.set(ANALYTICS_SESSION_COOKIE, { value: "some-token" });

    await logoutFromAnalytics();

    expect(cookieStore.has(ANALYTICS_SESSION_COOKIE)).toBe(false);
  });
});
