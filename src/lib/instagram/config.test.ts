import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSecret, getInstagramConfig, getVerifyToken } from "./config";

const REQUIRED = {
  IG_ACCESS_TOKEN: "token-123",
  IG_ACCOUNT_ID: "28392521167038682",
  IG_TRIGGER_WORD: "country",
  IG_REPLY_TEXT: "Here's the link!",
};

function stubAll(overrides: Record<string, string | undefined> = {}) {
  for (const [key, value] of Object.entries({ ...REQUIRED, ...overrides })) {
    vi.stubEnv(key, value as string);
  }
}

describe("getInstagramConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a config when every required var is set", () => {
    stubAll();
    const result = getInstagramConfig();

    expect(result).toEqual({
      ok: true,
      config: {
        accessToken: "token-123",
        accountId: "28392521167038682",
        triggerWord: "country",
        replyText: "Here's the link!",
        allowSelfComments: false,
      },
    });
  });

  it.each(Object.keys(REQUIRED))("reports %s by name when it is missing", (name) => {
    stubAll({ [name]: "" });
    const result = getInstagramConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual([name]);
  });

  it("reports every missing var at once when nothing is configured", () => {
    const result = getInstagramConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(Object.keys(REQUIRED));
  });

  it("trims surrounding whitespace, so a pasted trailing newline can't break the token", () => {
    stubAll({ IG_ACCESS_TOKEN: "  token-123\n" });
    const result = getInstagramConfig();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.accessToken).toBe("token-123");
  });

  it("treats a whitespace-only value as missing rather than as a valid token", () => {
    stubAll({ IG_ACCESS_TOKEN: "   " });
    const result = getInstagramConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(["IG_ACCESS_TOKEN"]);
  });

  it("enables self-comments only on the exact string \"true\"", () => {
    stubAll({ IG_ALLOW_SELF_COMMENTS: "true" });
    const enabled = getInstagramConfig();
    expect(enabled.ok && enabled.config.allowSelfComments).toBe(true);

    stubAll({ IG_ALLOW_SELF_COMMENTS: "yes" });
    const disabled = getInstagramConfig();
    expect(disabled.ok && disabled.config.allowSelfComments).toBe(false);
  });
});

describe("getVerifyToken / getAppSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the verify token independently of the send-side config", () => {
    vi.stubEnv("IG_VERIFY_TOKEN", "test-verify-token");
    expect(getVerifyToken()).toBe("test-verify-token");
    expect(getInstagramConfig().ok).toBe(false);
  });

  it("returns undefined when the verify token or app secret is unset", () => {
    expect(getVerifyToken()).toBeUndefined();
    expect(getAppSecret()).toBeUndefined();
  });
});
