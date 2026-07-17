import { MAJORS, type MajorId } from "../majors";
import type { AnalyticsRow } from "../supabase/analytics";

export interface AnalyticsSummary {
  total: number;
  choiceCount: number;
  scaleCount: number;
  choicePercentage: number;
  scalePercentage: number;
  optInCount: number;
  optInPercentage: number;
}

export function computeSummary(rows: AnalyticsRow[]): AnalyticsSummary {
  const total = rows.length;
  let choiceCount = 0;
  let scaleCount = 0;
  let optInCount = 0;

  for (const row of rows) {
    if (row.variant === "choice") choiceCount++;
    else if (row.variant === "scale") scaleCount++;
    if (row.email) optInCount++;
  }

  return {
    total,
    choiceCount,
    scaleCount,
    choicePercentage: total > 0 ? (choiceCount / total) * 100 : 0,
    scalePercentage: total > 0 ? (scaleCount / total) * 100 : 0,
    optInCount,
    optInPercentage: total > 0 ? (optInCount / total) * 100 : 0,
  };
}

export interface MajorDistributionEntry {
  majorId: MajorId;
  name: string;
  count: number;
  percentage: number;
}

/**
 * "Top major" per row is topMajors[0] - the highest-percentage entry.
 * top_majors is stored pre-sorted descending (getTopMajors' output), so
 * this is stable even when a row's top match was itself a multi-way tie.
 */
export function computeMajorDistribution(rows: AnalyticsRow[]): MajorDistributionEntry[] {
  const counts = new Map<MajorId, number>(MAJORS.map((major) => [major.id, 0]));

  for (const row of rows) {
    const topMajorId = row.topMajors[0]?.majorId;
    if (topMajorId && counts.has(topMajorId)) {
      counts.set(topMajorId, (counts.get(topMajorId) ?? 0) + 1);
    }
  }

  const total = rows.length;

  return MAJORS.map((major) => {
    const count = counts.get(major.id) ?? 0;
    return {
      majorId: major.id,
      name: major.name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
}

export interface DailyTrendPoint {
  date: string;
  count: number;
}

export interface DailyTrendOptions {
  days?: number;
  now?: Date;
}

/** Zero-filled daily submission counts, oldest to newest, bucketed by UTC
 * calendar day so results are deterministic regardless of server timezone. */
export function computeDailyTrend(
  rows: AnalyticsRow[],
  { days = 30, now = new Date() }: DailyTrendOptions = {}
): DailyTrendPoint[] {
  const countsByDay = new Map<string, number>();
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const trend: DailyTrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(todayUtc);
    day.setUTCDate(day.getUTCDate() - offset);
    const date = day.toISOString().slice(0, 10);
    trend.push({ date, count: countsByDay.get(date) ?? 0 });
  }

  return trend;
}

export interface PaginatedRows<T> {
  pageRows: T[];
  totalPages: number;
  currentPage: number;
}

/** Clamps out-of-range page numbers into [1, totalPages] instead of
 * returning an empty page or throwing. */
export function paginateRows<T>(rows: T[], page: number, pageSize: number): PaginatedRows<T> {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const requestedPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (currentPage - 1) * pageSize;

  return { pageRows: rows.slice(start, start + pageSize), totalPages, currentPage };
}
