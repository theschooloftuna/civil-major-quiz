import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AnalyticsRow } from "@/lib/supabase/analytics";

const hasValidAnalyticsSessionMock = vi.fn();
const getAnalyticsRowsMock = vi.fn();
const loginToAnalyticsMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/lib/analytics/auth", () => ({
  hasValidAnalyticsSession: () => hasValidAnalyticsSessionMock(),
}));

vi.mock("@/lib/supabase/analytics", () => ({
  getAnalyticsRows: () => getAnalyticsRowsMock(),
}));

vi.mock("@/lib/analytics/actions", () => ({
  loginToAnalytics: (...args: unknown[]) => loginToAnalyticsMock(...args),
  logoutFromAnalytics: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const { default: AnalyticsPage } = await import("./page");

function makeRow(overrides: Partial<AnalyticsRow> = {}): AnalyticsRow {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-07-15T00:00:00Z",
    variant: "choice",
    topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }],
    email: null,
    ...overrides,
  };
}

const noPage = Promise.resolve({});

describe("AnalyticsPage", () => {
  beforeEach(() => {
    hasValidAnalyticsSessionMock.mockReset();
    getAnalyticsRowsMock.mockReset();
    loginToAnalyticsMock.mockReset();
  });

  test("shows the passcode form and no dashboard data when there is no valid session", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(false);

    const jsx = await AnalyticsPage({ searchParams: noPage });
    render(jsx);

    expect(screen.getByLabelText(/passcode/i)).toBeInTheDocument();
    expect(screen.queryByText(/total participants/i)).not.toBeInTheDocument();
    expect(getAnalyticsRowsMock).not.toHaveBeenCalled();
  });

  test("shows a config-error message when the service role key isn't configured", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getAnalyticsRowsMock.mockResolvedValue(null);

    const jsx = await AnalyticsPage({ searchParams: noPage });
    render(jsx);

    expect(screen.getByText(/analytics unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/SUPABASE_SERVICE_ROLE_KEY/)).toBeInTheDocument();
  });

  test("renders zeroed-out stats and an empty table for zero participants", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getAnalyticsRowsMock.mockResolvedValue([]);

    const jsx = await AnalyticsPage({ searchParams: noPage });
    render(jsx);

    expect(screen.getByText("Total participants")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument();
  });

  test("renders totals, variant split, opt-in rate, all 7 majors, and the current page of participants", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getAnalyticsRowsMock.mockResolvedValue([
      makeRow({ variant: "choice", email: "a@example.com" }),
      makeRow({ variant: "scale", email: null }),
      makeRow({
        variant: "choice",
        email: null,
        topMajors: [{ majorId: "geotechnical", raw: 3, max: 3, percentage: 100 }],
      }),
    ]);

    const jsx = await AnalyticsPage({ searchParams: noPage });
    render(jsx);

    // Stat tiles - scoped to each card so chart axis ticks (which also
    // render plain numeric text nodes) can't collide with these queries.
    const totalCard = screen.getByText("Total participants").closest('[data-slot="card"]');
    expect(within(totalCard as HTMLElement).getByText("3")).toBeInTheDocument();

    const variantCard = screen.getByText("Quiz variant").closest('[data-slot="card"]');
    expect(within(variantCard as HTMLElement).getByText("2 / 1")).toBeInTheDocument();

    const optInCard = screen.getByText("Email opt-in").closest('[data-slot="card"]');
    expect(within(optInCard as HTMLElement).getByText("1")).toBeInTheDocument();

    // All 7 majors present in the distribution chart (some names also
    // appear again in the participant table's "Top major" column).
    for (const name of [
      "Structural Engineering",
      "Geotechnical Engineering",
      "Transportation Engineering",
      "Environmental Engineering",
      "Water Resources Engineering",
      "Construction Management",
      "Disaster Risk Reduction Engineering",
    ]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }

    // Participant table rows
    expect(screen.getByText("a@example.com")).toBeInTheDocument();
  });

  test("paginates the participant table and clamps an out-of-range page", async () => {
    hasValidAnalyticsSessionMock.mockResolvedValue(true);
    getAnalyticsRowsMock.mockResolvedValue(
      Array.from({ length: 60 }, (_, i) => makeRow({ id: `row-${i}` }))
    );

    const jsx = await AnalyticsPage({ searchParams: Promise.resolve({ page: "99" }) });
    render(jsx);

    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });
});
