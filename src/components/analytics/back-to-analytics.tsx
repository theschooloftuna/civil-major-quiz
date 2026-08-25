import Link from "next/link";

/** Sub-dashboards are nested a level down, so they need a way back up. */
function BackToAnalytics() {
  return (
    <Link
      href="/analytics"
      className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      ← Analytics
    </Link>
  );
}

export { BackToAnalytics };
