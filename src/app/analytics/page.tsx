import type { Metadata } from "next";

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
  title: "Analytics | Civil Major Quiz",
};

const PARTICIPANTS_PAGE_SIZE = 50;

interface AnalyticsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const hasSession = await hasValidAnalyticsSession();

  if (!hasSession) {
    return <LoginForm />;
  }

  const rows = await getAnalyticsRows();

  if (rows === null) {
    return <ConfigError />;
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
        <h1 className="text-3xl font-normal text-foreground">Analytics</h1>
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
        <ParticipantsTable rows={pageRows} currentPage={currentPage} totalPages={totalPages} />
      </section>
    </div>
  );
}
