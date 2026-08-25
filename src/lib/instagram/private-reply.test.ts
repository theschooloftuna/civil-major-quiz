import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InstagramConfig } from "./config";
import { sendPrivateReply } from "./private-reply";

const CONFIG: InstagramConfig = {
  accessToken: "token-123",
  accountId: "28392521167038682",
  triggerWord: "country",
  replyText: "Here is your link: https://example.com",
  allowSelfComments: false,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendPrivateReply", () => {
  it("posts to the Instagram-login private reply endpoint with the account id", async () => {
    fetchMock.mockResolvedValue(new Response('{"message_id":"m1"}', { status: 200 }));

    await sendPrivateReply(CONFIG, "comment-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.instagram.com/v25.0/28392521167038682/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token-123",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      recipient: { comment_id: "comment-1" },
      message: { text: "Here is your link: https://example.com" },
    });
  });

  it("reports success with the status and body", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"recipient_id":"r1","message_id":"m1"}', { status: 200 })
    );

    await expect(sendPrivateReply(CONFIG, "comment-1")).resolves.toEqual({
      ok: true,
      status: 200,
      body: '{"recipient_id":"r1","message_id":"m1"}',
    });
  });

  it("surfaces a non-2xx status and body instead of throwing", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"code":190,"message":"expired token"}}', { status: 400 })
    );

    const result = await sendPrivateReply(CONFIG, "comment-1");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body).toContain("expired token");
  });

  it("resolves rather than rejects when the network call throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));

    await expect(sendPrivateReply(CONFIG, "comment-1")).resolves.toEqual({
      ok: false,
      status: 0,
      body: "ECONNRESET",
    });
  });
});
