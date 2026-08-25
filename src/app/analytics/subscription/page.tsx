import type { Metadata } from "next";

import { BackToAnalytics } from "@/components/analytics/back-to-analytics";
import { ConfigError } from "@/components/analytics/config-error";
import { CopyEmailsButton } from "@/components/analytics/copy-emails-button";
import { LoginForm } from "@/components/analytics/login-form";
import { LogoutButton } from "@/components/analytics/logout-button";
import { StatTile } from "@/components/analytics/stat-tile";
import { SubscribersTable } from "@/components/analytics/subscribers-table";
import { TrendChart } from "@/components/analytics/trend-chart";
import { hasValidAnalyticsSession } from "@/lib/analytics/auth";
import { computeDailyTrend, paginateRows } from "@/lib/analytics/stats";
import { computeSubscriberSummary, subscribedEmails } from "@/lib/analytics/subscriber-stats";
import { getSubscriberRows } from "@/lib/supabase/subscribers";

export const metadata: Metadata = {
  title: "Subscription analytics | Civil Major Quiz",
};

// Same reason as the other analytics routes: the session cookie read below
// did not reliably trigger implicit dynamic detection in a production build,
// so the gate has to be forced rather than inferred.
export const dynamic = "force-dynamic";

const SUBSCRIBERS_PAGE_SIZE = 50;

interface SubscriptionPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SubscriptionAnalyticsPage({ searchParams }: SubscriptionPageProps) {
  // Checked here rather than in a shared layout: a layout doesn't re-run on
  // client-side navigation between sibling routes, so this page would be
  // rendering email addresses on the strength of a check that never ran.
  const hasSession = await hasValidAnalyticsSession();

  if (!hasSession) {
    return <LoginForm />;
  }

  const rows = await getSubscriberRows();

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
  const summary = computeSubscriberSummary(rows);
  const dailyTrend = computeDailyTrend(rows);
  const emails = subscribedEmails(rows);
  const { pageRows, currentPage, totalPages } = paginateRows(
    rows,
    Number(pageParam ?? "1"),
    SUBSCRIBERS_PAGE_SIZE
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <BackToAnalytics />
          <h1 className="text-3xl font-normal text-foreground">Subscription</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="On the list" value={String(summary.subscribed)} />
        <StatTile label="Unsubscribed" value={String(summary.unsubscribed)} />
        <StatTile
          label="Signed up via"
          value={`${summary.fromQuiz} / ${summary.fromNewsletterPage}`}
          sublabel="Quiz / Newsletter page"
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-normal text-foreground">New subscribers, last 30 days</h2>
        <TrendChart data={dailyTrend} label="New subscribers" />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-normal text-foreground">Subscribers</h2>
          <CopyEmailsButton emails={emails} />
        </div>
        <SubscribersTable
          rows={pageRows}
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/analytics/subscription"
        />
      </section>
    </div>
  );
}
