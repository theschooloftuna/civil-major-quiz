import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/analytics/login-form";
import { LogoutButton } from "@/components/analytics/logout-button";
import { buttonVariants } from "@/components/theme-custom/button";
import { hasValidAnalyticsSession } from "@/lib/analytics/auth";

export const metadata: Metadata = {
  title: "Analytics | Civil Major Quiz",
};

// hasValidAnalyticsSession() reads a per-request cookie, but Next.js's
// implicit dynamic-rendering detection was observed (via a production
// build) to still statically prerender and cache this route instead of
// bailing out - force it explicitly so the passcode gate actually runs
// on every request instead of being served from a stale static cache.
export const dynamic = "force-dynamic";

/**
 * Hub only. Deliberately fetches nothing: opening this page used to pull
 * every quiz row, which made checking the newsletter list expensive and
 * still didn't show it.
 */
export default async function AnalyticsPage() {
  const hasSession = await hasValidAnalyticsSession();

  if (!hasSession) {
    return <LoginForm />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-normal text-foreground">Analytics</h1>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/analytics/quiz" className={buttonVariants({ size: "lg" })}>
          Quiz
        </Link>
        <Link href="/analytics/subscription" className={buttonVariants({ size: "lg" })}>
          Subscription
        </Link>
      </div>
    </div>
  );
}
