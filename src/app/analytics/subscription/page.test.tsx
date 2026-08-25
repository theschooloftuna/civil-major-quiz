import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SubscriberRow } from "@/lib/supabase/subscribers";

const hasValidAnalyticsSessionMock = vi.fn();
const getSubscriberRowsMock = vi.fn();
const getAnalyticsRowsMock = vi.fn();

vi.mock("@/lib/analytics/auth", () => ({
  hasValidAnalyticsSession: () => hasValidAnalyticsSessionMock(),
}));

vi.mock("@/lib/supabase/subscribers", () => ({
  getSubscriberRows: () => getSubscriberRowsMock(),
}));

vi.mock("@/lib/supabase/analytics", () => ({
  getAnalyticsRows: () => getAnalyticsRowsMock(),
}));

vi.mock("@/lib/analytics/actions", () => ({
  loginToAnalytics: vi.fn(),
  logoutFromAnalytics: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { default: SubscriptionAnalyticsPage } = await import("./page");

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

const noPage = Promise.resolve({});

beforeEach(() => {
  hasValidAnalyticsSessionMock.mockReset();
  getSubscriberRowsMock.mockReset();
  getAnalyticsRowsMock.mockReset();
});

describe("SubscriptionAnalyticsPage", () => {
  test("shows the passcode form and no subscriber data without a session", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(false);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    expect(screen.getByLabelText(/passcode/i)).toBeInTheDocument();
    expect(getSubscriberRowsMock).not.toHaveBeenCalled();
  });

  test("never queries the quiz table", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue([row()]);

    await SubscriptionAnalyticsPage({ searchParams: noPage });

    expect(getAnalyticsRowsMock).not.toHaveBeenCalled();
  });

  test("shows a config-error state with a logout when the read fails", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue(null);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    expect(screen.getByRole("button", { name: /log ?out/i })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("counts subscribed, unsubscribed and source split", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue([
      row({ status: "subscribed", source: "quiz" }),
      row({ status: "subscribed", source: "newsletter_page" }),
      row({ status: "unsubscribed", source: "quiz", unsubscribedAt: "2026-08-20T00:00:00Z" }),
    ]);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    // Scoped to each card, so chart axis ticks (also plain numeric text)
    // can't satisfy these queries - same reason as the quiz page test.
    const onList = screen.getByText("On the list").closest('[data-slot="card"]');
    expect(within(onList as HTMLElement).getByText("2")).toBeInTheDocument();

    const churned = screen.getByText("Unsubscribed").closest('[data-slot="card"]');
    expect(within(churned as HTMLElement).getByText("1")).toBeInTheDocument();

    const source = screen.getByText("Signed up via").closest('[data-slot="card"]');
    expect(within(source as HTMLElement).getByText("2 / 1")).toBeInTheDocument();
  });

  test("offers to copy only the currently-subscribed addresses", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue([
      row({ email: "in@example.com", status: "subscribed" }),
      row({ email: "out@example.com", status: "unsubscribed" }),
    ]);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    expect(
      screen.getByRole("button", { name: /copy 1 subscribed email$/i })
    ).toBeInTheDocument();
  });

  test("renders an empty state for zero subscribers", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue([]);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    expect(screen.getByText(/no subscribers yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no emails to copy/i })).toBeDisabled();
  });

  test("links back to the analytics hub", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getSubscriberRowsMock.mockResolvedValue([row()]);

    render(await SubscriptionAnalyticsPage({ searchParams: noPage }));

    expect(screen.getByRole("link", { name: /analytics/i })).toHaveAttribute("href", "/analytics");
  });
});
