import { describe, expect, it } from "vitest";

import { extractCommentEvents, matchesTrigger } from "./payload";

/** Verbatim shape of a real delivery, per `instagram-dm-automation.md`. */
const REAL_PAYLOAD = {
  object: "instagram",
  entry: [
    {
      id: "28392521167038682",
      time: 0,
      changes: [
        {
          field: "comments",
          value: {
            from: { id: "9876543210", username: "someviewer" },
            media: { id: "media-1", media_product_type: "FEED" },
            id: "comment-1",
            parent_id: "parent-1",
            text: "COUNTRY please!",
          },
        },
      ],
    },
  ],
};

describe("extractCommentEvents", () => {
  it("extracts a comment from a real webhook payload", () => {
    expect(extractCommentEvents(REAL_PAYLOAD)).toEqual([
      {
        commentId: "comment-1",
        text: "COUNTRY please!",
        fromId: "9876543210",
        fromUsername: "someviewer",
        mediaId: "media-1",
      },
    ]);
  });

  it("extracts every change across every entry", () => {
    const events = extractCommentEvents({
      entry: [
        {
          changes: [
            { field: "comments", value: { id: "c1", text: "one" } },
            { field: "comments", value: { id: "c2", text: "two" } },
          ],
        },
        { changes: [{ field: "comments", value: { id: "c3", text: "three" } }] },
      ],
    });

    expect(events.map((event) => event.commentId)).toEqual(["c1", "c2", "c3"]);
  });

  it("ignores changes for fields other than comments", () => {
    const events = extractCommentEvents({
      entry: [
        {
          changes: [
            { field: "mentions", value: { id: "m1", text: "hi" } },
            { field: "comments", value: { id: "c1", text: "hi" } },
          ],
        },
      ],
    });

    expect(events.map((event) => event.commentId)).toEqual(["c1"]);
  });

  it("skips changes missing an id or text", () => {
    const events = extractCommentEvents({
      entry: [
        {
          changes: [
            { field: "comments", value: { text: "no id" } },
            { field: "comments", value: { id: "c1" } },
            { field: "comments", value: { id: "c2", text: 42 } },
            { field: "comments", value: { id: "c3", text: "kept" } },
          ],
        },
      ],
    });

    expect(events.map((event) => event.commentId)).toEqual(["c3"]);
  });

  it("keeps a comment whose `from` block is absent", () => {
    const events = extractCommentEvents({
      entry: [{ changes: [{ field: "comments", value: { id: "c1", text: "hi" } }] }],
    });

    expect(events).toEqual([
      {
        commentId: "c1",
        text: "hi",
        fromId: undefined,
        fromUsername: undefined,
        mediaId: undefined,
      },
    ]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "nonsense"],
    ["a number", 7],
    ["an array", [{ entry: [] }]],
    ["an object with no entry", { object: "instagram" }],
    ["an entry that isn't an array", { entry: { changes: [] } }],
    ["an entry item that isn't an object", { entry: ["nope"] }],
    ["changes that aren't an array", { entry: [{ changes: "nope" }] }],
    ["a change with a non-object value", { entry: [{ changes: [{ field: "comments", value: "x" }] }] }],
    ["an empty envelope", { entry: [] }],
  ])("returns [] for %s without throwing", (_label, body) => {
    expect(extractCommentEvents(body)).toEqual([]);
  });

  it("returns [] for Meta's Test-button payload shape without a matching field", () => {
    expect(extractCommentEvents({ entry: [{ changes: [{ field: "story_insights" }] }] })).toEqual(
      []
    );
  });
});

describe("matchesTrigger", () => {
  it("matches case-insensitively", () => {
    expect(matchesTrigger("COUNTRY", "country")).toBe(true);
    expect(matchesTrigger("country", "COUNTRY")).toBe(true);
    expect(matchesTrigger("Country please", "country")).toBe(true);
  });

  it("matches the trigger anywhere in the comment", () => {
    expect(matchesTrigger("hey can I get country thanks", "country")).toBe(true);
    expect(matchesTrigger("country", "country")).toBe(true);
  });

  it("does not match an unrelated comment", () => {
    expect(matchesTrigger("great reel!", "country")).toBe(false);
    expect(matchesTrigger("", "country")).toBe(false);
  });

  it("does not match Meta's Test-button placeholder text", () => {
    expect(matchesTrigger("This is an example.", "country")).toBe(false);
  });

  it("matches on a substring, so 'countryside' triggers 'country' (documented, accepted)", () => {
    expect(matchesTrigger("countryside", "country")).toBe(true);
  });

  it("tolerates a padded trigger word from env", () => {
    expect(matchesTrigger("country", "  country  ")).toBe(true);
  });

  it("never matches on an empty trigger word", () => {
    expect(matchesTrigger("anything at all", "")).toBe(false);
    expect(matchesTrigger("anything at all", "   ")).toBe(false);
  });
});
