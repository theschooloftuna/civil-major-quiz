import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const hasValidAnalyticsSessionMock = vi.fn();
const getAnalyticsRowsMock = vi.fn();
const getSubscriberRowsMock = vi.fn();

vi.mock("@/lib/analytics/auth", () => ({
  hasValidAnalyticsSession: () => hasValidAnalyticsSessionMock(),
}));

vi.mock("@/lib/supabase/analytics", () => ({
  getAnalyticsRows: () => getAnalyticsRowsMock(),
}));

vi.mock("@/lib/supabase/subscribers", () => ({
  getSubscriberRows: () => getSubscriberRowsMock(),
}));

vi.mock("@/lib/analytics/actions", () => ({
  loginToAnalytics: vi.fn(),
  logoutFromAnalytics: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { default: AnalyticsPage } = await import("./page");

describe("AnalyticsPage (hub)", () => {
  beforeEach(() => {
    hasValidAnalyticsSessionMock.mockReset();
    getAnalyticsRowsMock.mockReset();
    getSubscriberRowsMock.mockReset();
  });

  test("shows the passcode form when there is no valid session", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(false);

    render(await AnalyticsPage());

    expect(screen.getByLabelText(/passcode/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /quiz/i })).not.toBeInTheDocument();
  });

  test("links to both dashboards for a valid session", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);

    render(await AnalyticsPage());

    expect(screen.getByRole("link", { name: /quiz/i })).toHaveAttribute(
      "href",
      "/analytics/quiz"
    );
    expect(screen.getByRole("link", { name: /subscription/i })).toHaveAttribute(
      "href",
      "/analytics/subscription"
    );
  });

  test("fetches no rows from either table - that is the whole point of the hub", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);

    render(await AnalyticsPage());

    expect(getAnalyticsRowsMock).not.toHaveBeenCalled();
    expect(getSubscriberRowsMock).not.toHaveBeenCalled();
  });

  test("offers a way to log out", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);

    render(await AnalyticsPage());

    expect(screen.getByRole("button", { name: /log ?out/i })).toBeInTheDocument();
  });
});
