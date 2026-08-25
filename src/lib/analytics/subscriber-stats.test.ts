import { describe, expect, test } from "vitest";

import { computeSubscriberSummary, subscribedEmails } from "./subscriber-stats";
import type { SubscriberRow } from "../supabase/subscribers";

function row(overrides: Partial<SubscriberRow> = {}): SubscriberRow {
  return {
    id: crypto.randomUUID(),
    email: "a@example.com",
    status: "subscribed",
    source: "quiz",
    createdAt: "2026-08-01T00:00:00Z",
    subscribedAt: "2026-08-01T00:00:00Z",
    unsubscribedAt: null,
    ...overrides,
  };
}

describe("computeSubscriberSummary", () => {
  test("counts status and source independently", () => {
    const summary = computeSubscriberSummary([
      row({ status: "subscribed", source: "quiz" }),
      row({ status: "subscribed", source: "newsletter_page" }),
      row({ status: "unsubscribed", source: "quiz" }),
    ]);

    expect(summary).toEqual({
      total: 3,
      subscribed: 2,
      unsubscribed: 1,
      fromQuiz: 2,
      fromNewsletterPage: 1,
    });
  });

  test("returns zeroes for an empty list", () => {
    expect(computeSubscriberSummary([])).toEqual({
      total: 0,
      subscribed: 0,
      unsubscribed: 0,
      fromQuiz: 0,
      fromNewsletterPage: 0,
    });
  });
});

describe("subscribedEmails", () => {
  test("returns only currently-subscribed addresses", () => {
    const emails = subscribedEmails([
      row({ email: "in@example.com", status: "subscribed" }),
      row({ email: "out@example.com", status: "unsubscribed" }),
    ]);

    expect(emails).toEqual(["in@example.com"]);
  });

  test("is empty when nobody is subscribed", () => {
    expect(subscribedEmails([row({ status: "unsubscribed" })])).toEqual([]);
  });
});
