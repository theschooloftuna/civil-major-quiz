// @vitest-environment node
// Needs the real Request/Response globals and node:crypto, not jsdom.
import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processCommentEvents = vi.fn();

vi.mock("@/lib/instagram/process", () => ({
  processCommentEvents: (...args: unknown[]) => processCommentEvents(...args),
}));

// `after` defers work past the response; run it inline so tests can assert on it.
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    void callback();
  },
}));

const { GET, POST } = await import("./route");

const VERIFY_TOKEN = "test-verify-token";
const APP_SECRET = "app-secret";

const PAYLOAD = {
  object: "instagram",
  entry: [
    {
      id: "owner-id",
      time: 0,
      changes: [
        {
          field: "comments",
          value: {
            from: { id: "viewer-id", username: "someviewer" },
            media: { id: "media-1", media_product_type: "FEED" },
            id: "comment-1",
            text: "COUNTRY please",
          },
        },
      ],
    },
  ],
};

function sign(body: string, secret = APP_SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

function getRequest(params: Record<string, string>): Request {
  const url = new URL("https://example.com/api/instagram/webhook");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Request(url);
}

function postRequest(rawBody: string, signature?: string): Request {
  return new Request("https://example.com/api/instagram/webhook", {
    method: "POST",
    headers: signature
      ? { "content-type": "application/json", "x-hub-signature-256": signature }
      : { "content-type": "application/json" },
    body: rawBody,
  });
}

/** Only the send-side vars; the verify token is stubbed per-test. */
function stubSendConfig() {
  vi.stubEnv("IG_ACCESS_TOKEN", "token-123");
  vi.stubEnv("IG_ACCOUNT_ID", "owner-id");
  vi.stubEnv("IG_TRIGGER_WORD", "country");
  vi.stubEnv("IG_REPLY_TEXT", "link");
}

beforeEach(() => {
  processCommentEvents.mockReset().mockResolvedValue([]);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET (Meta's verification handshake)", () => {
  beforeEach(() => {
    vi.stubEnv("IG_VERIFY_TOKEN", VERIFY_TOKEN);
  });

  it("echoes hub.challenge as plain text on a correct verify token", async () => {
    const response = await GET(
      getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "abc123",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("abc123");
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  it("rejects a wrong verify token without echoing the challenge", async () => {
    const response = await GET(
      getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong",
        "hub.challenge": "abc123",
      })
    );

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("abc123");
  });

  it("rejects a missing verify token", async () => {
    const response = await GET(
      getRequest({ "hub.mode": "subscribe", "hub.challenge": "abc123" })
    );

    expect(response.status).toBe(403);
  });

  it("rejects a mode other than subscribe", async () => {
    const response = await GET(
      getRequest({
        "hub.mode": "unsubscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "abc123",
      })
    );

    expect(response.status).toBe(403);
  });

  it("rejects rather than throwing when IG_VERIFY_TOKEN is unset", async () => {
    vi.unstubAllEnvs();

    const response = await GET(
      getRequest({
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "abc123",
      })
    );

    expect(response.status).toBe(403);
  });
});

describe("POST (comment events)", () => {
  beforeEach(() => {
    stubSendConfig();
  });

  it("processes a correctly signed delivery", async () => {
    vi.stubEnv("IG_APP_SECRET", APP_SECRET);
    const rawBody = JSON.stringify(PAYLOAD);

    const response = await POST(postRequest(rawBody, sign(rawBody)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: 1 });
    expect(processCommentEvents).toHaveBeenCalledOnce();
    expect(processCommentEvents.mock.calls[0][0]).toEqual([
      {
        commentId: "comment-1",
        text: "COUNTRY please",
        fromId: "viewer-id",
        fromUsername: "someviewer",
        mediaId: "media-1",
      },
    ]);
  });

  it("rejects an invalid signature with 403 and sends nothing", async () => {
    vi.stubEnv("IG_APP_SECRET", APP_SECRET);
    const rawBody = JSON.stringify(PAYLOAD);

    const response = await POST(postRequest(rawBody, sign(rawBody, "other-secret")));

    expect(response.status).toBe(403);
    expect(processCommentEvents).not.toHaveBeenCalled();
  });

  it("rejects a missing signature when the app secret is set", async () => {
    vi.stubEnv("IG_APP_SECRET", APP_SECRET);

    const response = await POST(postRequest(JSON.stringify(PAYLOAD)));

    expect(response.status).toBe(403);
    expect(processCommentEvents).not.toHaveBeenCalled();
  });

  it("processes an unsigned delivery, with a warning, when no app secret is set", async () => {
    const response = await POST(postRequest(JSON.stringify(PAYLOAD)));

    expect(response.status).toBe(200);
    expect(processCommentEvents).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("IG_APP_SECRET"));
  });

  it("answers 200 on an unparseable body so Meta does not retry", async () => {
    const response = await POST(postRequest("not json at all"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: 0 });
    expect(processCommentEvents).not.toHaveBeenCalled();
  });

  it("answers 200 with no work for an unrecognized payload shape", async () => {
    const response = await POST(postRequest(JSON.stringify({ object: "instagram" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: 0 });
    expect(processCommentEvents).not.toHaveBeenCalled();
  });

  it("answers 200 without sending when the send-side env vars are missing", async () => {
    vi.unstubAllEnvs();

    const response = await POST(postRequest(JSON.stringify(PAYLOAD)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: 1 });
    expect(processCommentEvents).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("IG_ACCESS_TOKEN"));
  });
});
