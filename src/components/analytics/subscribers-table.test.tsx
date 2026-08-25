import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SubscribersTable } from "./subscribers-table";
import type { SubscriberRow } from "@/lib/supabase/subscribers";

function row(overrides: Partial<SubscriberRow> = {}): SubscriberRow {
  return {
    id: crypto.randomUUID(),
    email: "reader@example.com",
    status: "subscribed",
    source: "quiz",
    createdAt: "2026-08-01T10:00:00Z",
    subscribedAt: "2026-08-01T10:00:00Z",
    unsubscribedAt: null,
    ...overrides,
  };
}

describe("SubscribersTable", () => {
  test("shows unsubscribed people alongside subscribed ones", () => {
    render(
      <SubscribersTable
        rows={[
          row({ email: "in@example.com", status: "subscribed" }),
          row({
            email: "out@example.com",
            status: "unsubscribed",
            unsubscribedAt: "2026-08-20T10:00:00Z",
          }),
        ]}
        currentPage={1}
        totalPages={1}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.getByText("in@example.com")).toBeInTheDocument();
    expect(screen.getByText("out@example.com")).toBeInTheDocument();
    expect(screen.getByText("unsubscribed")).toBeInTheDocument();
  });

  test("labels the source in words rather than the raw enum", () => {
    render(
      <SubscribersTable
        rows={[row({ source: "newsletter_page" })]}
        currentPage={1}
        totalPages={1}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.getByText("Newsletter page")).toBeInTheDocument();
    expect(screen.queryByText("newsletter_page")).not.toBeInTheDocument();
  });

  test("shows an em dash rather than a blank for someone still subscribed", () => {
    render(
      <SubscribersTable
        rows={[row({ unsubscribedAt: null })]}
        currentPage={1}
        totalPages={1}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("renders an empty state with no rows", () => {
    render(
      <SubscribersTable
        rows={[]}
        currentPage={1}
        totalPages={1}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.getByText(/no subscribers yet/i)).toBeInTheDocument();
  });

  test("points pagination at its own route, not the analytics hub", () => {
    render(
      <SubscribersTable
        rows={[row()]}
        currentPage={2}
        totalPages={3}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      "/analytics/subscription?page=1"
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "/analytics/subscription?page=3"
    );
  });

  test("hides pagination when everything fits on one page", () => {
    render(
      <SubscribersTable
        rows={[row()]}
        currentPage={1}
        totalPages={1}
        basePath="/analytics/subscription"
      />
    );

    expect(screen.queryByRole("link", { name: /next/i })).not.toBeInTheDocument();
  });
});
