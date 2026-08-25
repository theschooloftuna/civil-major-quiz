import type { Metadata } from "next";

import { BackToAnalytics } from "@/components/analytics/back-to-analytics";
import { ConfigError } from "@/components/analytics/config-error";
import { LoginForm } from "@/components/analytics/login-form";
import { LogoutButton } from "@/components/analytics/logout-button";
import { MajorDistributionChart } from "@/components/analytics/major-distribution-chart";
import { ParticipantsTable } from "@/components/analytics/participants-table";
import { StatTile } from "@/components/analytics/stat-tile";
import { TrendChart } from "@/components/analytics/trend-chart";
import { hasValidAnalyticsSession } from "@/lib/analytics/auth";
import {
  computeDailyTrend,
  computeMajorDistribution,
  computeSummary,
  paginateRows,
} from "@/lib/analytics/stats";
import { getAnalyticsRows } from "@/lib/supabase/analytics";

export const metadata: Metadata = {
  title: "Quiz analytics | Civil Major Quiz",
};

// hasValidAnalyticsSession() reads a per-request cookie, but Next.js's
// implicit dynamic-rendering detection was observed (via a production
// build) to still statically prerender and cache this route instead of
// bailing out - force it explicitly so the passcode gate actually runs
// on every request instead of being served from a stale static cache.
export const dynamic = "force-dynamic";

const PARTICIPANTS_PAGE_SIZE = 50;

interface QuizAnalyticsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function QuizAnalyticsPage({ searchParams }: QuizAnalyticsPageProps) {
  const hasSession = await hasValidAnalyticsSession();

  if (!hasSession) {
    return <LoginForm />;
  }

  const rows = await getAnalyticsRows();

  // The logout control lives here, outside the rows === null branch below,
  // so a valid session that hits a config error still has a way out other
  // than waiting for the cookie to expire.
  if (rows === null) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex items-center justify-end">
          <LogoutButton />
        </div>
        <ConfigError />
      </div>
    );
  }

  const { page: pageParam } = await searchParams;
  const summary = computeSummary(rows);
  const majorDistribution = computeMajorDistribution(rows);
  const dailyTrend = computeDailyTrend(rows);
  const { pageRows, currentPage, totalPages } = paginateRows(
    rows,
    Number(pageParam ?? "1"),
    PARTICIPANTS_PAGE_SIZE
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <BackToAnalytics />
          <h1 className="text-3xl font-normal text-foreground">Quiz</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total participants" value={String(summary.total)} />
        <StatTile
          label="Quiz variant"
          value={`${summary.choiceCount} / ${summary.scaleCount}`}
          sublabel="Choice / Scale"
        />
        <StatTile
          label="Email opt-in"
          value={String(summary.optInCount)}
          sublabel={`${summary.optInPercentage.toFixed(0)}% of participants`}
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-normal text-foreground">Participation, last 30 days</h2>
        <TrendChart data={dailyTrend} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-normal text-foreground">Major match distribution</h2>
        <MajorDistributionChart data={majorDistribution} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-normal text-foreground">Participants</h2>
        <ParticipantsTable
          rows={pageRows}
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/analytics/quiz"
        />
      </section>
    </div>
  );
}
