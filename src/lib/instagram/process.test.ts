import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InstagramConfig } from "./config";
import type { CommentEvent } from "./payload";

const claimComment = vi.fn();
const releaseComment = vi.fn();
const recordReplyStatus = vi.fn();
const sendPrivateReply = vi.fn();

vi.mock("./dedupe", () => ({
  claimComment: (...args: unknown[]) => claimComment(...args),
  releaseComment: (...args: unknown[]) => releaseComment(...args),
  recordReplyStatus: (...args: unknown[]) => recordReplyStatus(...args),
}));

vi.mock("./private-reply", () => ({
  sendPrivateReply: (...args: unknown[]) => sendPrivateReply(...args),
}));

const { processCommentEvents } = await import("./process");

const CONFIG: InstagramConfig = {
  accessToken: "token-123",
  accountId: "owner-id",
  triggerWord: "country",
  replyText: "link",
  allowSelfComments: false,
};

function event(overrides: Partial<CommentEvent> = {}): CommentEvent {
  return {
    commentId: "comment-1",
    text: "COUNTRY please",
    fromId: "viewer-id",
    ...overrides,
  };
}

beforeEach(() => {
  claimComment.mockReset().mockResolvedValue("claimed");
  releaseComment.mockReset().mockResolvedValue(undefined);
  recordReplyStatus.mockReset().mockResolvedValue(undefined);
  sendPrivateReply.mockReset().mockResolvedValue({ ok: true, status: 200, body: "{}" });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("processCommentEvents", () => {
  it("sends a private reply for a comment containing the trigger word", async () => {
    const results = await processCommentEvents([event()], CONFIG);

    expect(sendPrivateReply).toHaveBeenCalledWith(CONFIG, "comment-1");
    expect(recordReplyStatus).toHaveBeenCalledWith("comment-1", 200);
    expect(results).toEqual([{ commentId: "comment-1", outcome: "replied" }]);
  });

  it("sends nothing for a comment without the trigger word", async () => {
    const results = await processCommentEvents([event({ text: "nice reel" })], CONFIG);

    expect(sendPrivateReply).not.toHaveBeenCalled();
    expect(claimComment).not.toHaveBeenCalled();
    expect(results).toEqual([{ commentId: "comment-1", outcome: "no-match" }]);
  });

  it("skips the account's own comment so the bot never answers itself", async () => {
    const results = await processCommentEvents([event({ fromId: "owner-id" })], CONFIG);

    expect(sendPrivateReply).not.toHaveBeenCalled();
    expect(results).toEqual([{ commentId: "comment-1", outcome: "self-comment" }]);
  });

  it("replies to the account's own comment when IG_ALLOW_SELF_COMMENTS is on", async () => {
    const results = await processCommentEvents([event({ fromId: "owner-id" })], {
      ...CONFIG,
      allowSelfComments: true,
    });

    expect(sendPrivateReply).toHaveBeenCalledOnce();
    expect(results).toEqual([{ commentId: "comment-1", outcome: "replied" }]);
  });

  it("sends only once when Meta redelivers the same comment", async () => {
    claimComment.mockResolvedValueOnce("claimed").mockResolvedValueOnce("duplicate");

    const first = await processCommentEvents([event()], CONFIG);
    const second = await processCommentEvents([event()], CONFIG);

    expect(sendPrivateReply).toHaveBeenCalledOnce();
    expect(first).toEqual([{ commentId: "comment-1", outcome: "replied" }]);
    expect(second).toEqual([{ commentId: "comment-1", outcome: "duplicate" }]);
  });

  it("still sends when the dedupe store is unavailable, and records nothing", async () => {
    claimComment.mockResolvedValue("unavailable");

    const results = await processCommentEvents([event()], CONFIG);

    expect(sendPrivateReply).toHaveBeenCalledOnce();
    expect(recordReplyStatus).not.toHaveBeenCalled();
    expect(results).toEqual([{ commentId: "comment-1", outcome: "replied" }]);
  });

  it("releases the claim when the reply fails, so a retry can try again", async () => {
    sendPrivateReply.mockResolvedValue({ ok: false, status: 400, body: "expired token" });

    const results = await processCommentEvents([event()], CONFIG);

    expect(releaseComment).toHaveBeenCalledWith("comment-1");
    expect(recordReplyStatus).not.toHaveBeenCalled();
    expect(results).toEqual([{ commentId: "comment-1", outcome: "reply-failed" }]);
  });

  it("does not release a claim it never held", async () => {
    claimComment.mockResolvedValue("unavailable");
    sendPrivateReply.mockResolvedValue({ ok: false, status: 500, body: "boom" });

    await processCommentEvents([event()], CONFIG);

    expect(releaseComment).not.toHaveBeenCalled();
  });

  it("processes sibling events independently when one throws", async () => {
    sendPrivateReply
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, status: 200, body: "{}" });

    const results = await processCommentEvents(
      [event({ commentId: "c1" }), event({ commentId: "c2" })],
      CONFIG
    );

    expect(results).toEqual([
      { commentId: "c1", outcome: "reply-failed" },
      { commentId: "c2", outcome: "replied" },
    ]);
  });

  it("returns an empty result set for an empty delivery", async () => {
    await expect(processCommentEvents([], CONFIG)).resolves.toEqual([]);
    expect(sendPrivateReply).not.toHaveBeenCalled();
  });
});
