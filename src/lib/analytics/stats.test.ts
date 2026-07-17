import { describe, expect, it } from "vitest";
import { MAJORS } from "../majors";
import type { AnalyticsRow } from "../supabase/analytics";
import {
  computeDailyTrend,
  computeMajorDistribution,
  computeSummary,
  paginateRows,
} from "./stats";

function row(overrides: Partial<AnalyticsRow> = {}): AnalyticsRow {
  return {
    id: "id",
    createdAt: "2026-07-01T00:00:00Z",
    variant: "choice",
    topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }],
    email: null,
    ...overrides,
  };
}

describe("computeSummary", () => {
  it("returns all zeros for an empty dataset", () => {
    expect(computeSummary([])).toEqual({
      total: 0,
      choiceCount: 0,
      scaleCount: 0,
      choicePercentage: 0,
      scalePercentage: 0,
      optInCount: 0,
      optInPercentage: 0,
    });
  });

  it("counts variant split and opt-in rate correctly", () => {
    const rows = [
      row({ variant: "choice", email: "a@example.com" }),
      row({ variant: "choice", email: null }),
      row({ variant: "scale", email: "b@example.com" }),
      row({ variant: "scale", email: null }),
    ];

    const summary = computeSummary(rows);

    expect(summary.total).toBe(4);
    expect(summary.choiceCount).toBe(2);
    expect(summary.scaleCount).toBe(2);
    expect(summary.choicePercentage).toBe(50);
    expect(summary.scalePercentage).toBe(50);
    expect(summary.optInCount).toBe(2);
    expect(summary.optInPercentage).toBe(50);
  });
});

describe("computeMajorDistribution", () => {
  it("includes all 7 majors even when some have zero occurrences", () => {
    const distribution = computeMajorDistribution([]);
    expect(distribution).toHaveLength(MAJORS.length);
    expect(distribution.every((entry) => entry.count === 0 && entry.percentage === 0)).toBe(true);
  });

  it("counts each row's highest-percentage top major and sums to the row count", () => {
    const rows = [
      row({ topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }] }),
      row({ topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }] }),
      row({ topMajors: [{ majorId: "geotechnical", raw: 3, max: 3, percentage: 100 }] }),
    ];

    const distribution = computeMajorDistribution(rows);
    const total = distribution.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(3);

    const structural = distribution.find((entry) => entry.majorId === "structural");
    expect(structural).toMatchObject({ count: 2, percentage: (2 / 3) * 100 });
  });

  it("uses only the first (highest) entry when a row's top match is a multi-way tie", () => {
    const rows = [
      row({
        topMajors: [
          { majorId: "structural", raw: 3, max: 3, percentage: 100 },
          { majorId: "geotechnical", raw: 3, max: 3, percentage: 100 },
        ],
      }),
    ];

    const distribution = computeMajorDistribution(rows);
    expect(distribution.find((entry) => entry.majorId === "structural")?.count).toBe(1);
    expect(distribution.find((entry) => entry.majorId === "geotechnical")?.count).toBe(0);
  });

  it("sorts by count descending", () => {
    const rows = [
      row({ topMajors: [{ majorId: "geotechnical", raw: 3, max: 3, percentage: 100 }] }),
      row({ topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }] }),
      row({ topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }] }),
    ];

    const distribution = computeMajorDistribution(rows);
    expect(distribution[0]).toMatchObject({ majorId: "structural", count: 2 });
  });
});

describe("computeDailyTrend", () => {
  const now = new Date("2026-07-18T15:00:00Z");

  it("returns `days` entries even with no submissions, zero-filled", () => {
    const trend = computeDailyTrend([], { days: 30, now });
    expect(trend).toHaveLength(30);
    expect(trend.every((point) => point.count === 0)).toBe(true);
    expect(trend[trend.length - 1].date).toBe("2026-07-18");
    expect(trend[0].date).toBe("2026-06-19");
  });

  it("buckets submissions by UTC calendar day, oldest to newest", () => {
    const rows = [
      row({ createdAt: "2026-07-18T10:00:00Z" }),
      row({ createdAt: "2026-07-18T23:59:59Z" }),
      row({ createdAt: "2026-07-10T00:00:00Z" }),
    ];

    const trend = computeDailyTrend(rows, { days: 30, now });

    expect(trend[trend.length - 1]).toEqual({ date: "2026-07-18", count: 2 });
    const july10 = trend.find((point) => point.date === "2026-07-10");
    expect(july10?.count).toBe(1);
  });

  it("excludes submissions outside the requested window", () => {
    const rows = [row({ createdAt: "2026-01-01T00:00:00Z" })];
    const trend = computeDailyTrend(rows, { days: 30, now });
    expect(trend.reduce((sum, point) => sum + point.count, 0)).toBe(0);
  });
});

describe("paginateRows", () => {
  const rows = Array.from({ length: 25 }, (_, i) => i);

  it("returns a full page and correct page count", () => {
    const result = paginateRows(rows, 1, 10);
    expect(result.pageRows).toEqual(rows.slice(0, 10));
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
  });

  it("returns a partial last page", () => {
    const result = paginateRows(rows, 3, 10);
    expect(result.pageRows).toEqual(rows.slice(20, 25));
    expect(result.currentPage).toBe(3);
  });

  it("clamps a page number beyond the last page to the last page", () => {
    const result = paginateRows(rows, 99, 10);
    expect(result.currentPage).toBe(3);
    expect(result.pageRows).toEqual(rows.slice(20, 25));
  });

  it("clamps a page number below 1 to 1", () => {
    const result = paginateRows(rows, 0, 10);
    expect(result.currentPage).toBe(1);
  });

  it("returns one empty page (not zero pages) for an empty dataset", () => {
    const result = paginateRows([], 1, 10);
    expect(result).toEqual({ pageRows: [], totalPages: 1, currentPage: 1 });
  });
});
