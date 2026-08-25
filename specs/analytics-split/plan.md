# Plan: Split analytics into quiz and subscription dashboards

## Spec
Link: `specs/analytics-split/spec.md`

## Codebase findings
> Gathered by reading the analytics stack directly; no Explore pass needed,
> the surface is four files.

- `src/app/analytics/page.tsx` does everything: session gate, config-error
  branch, `getAnalyticsRows()`, and all rendering. Moving it is mostly a file
  move plus a link fix.
- **`ParticipantsTable` hardcodes `/analytics?page=`** (lines 68, 81). Moving
  the dashboard to `/analytics/quiz` would silently break paging — the links
  would bounce users back to the hub. Needs a `basePath` prop.
- `computeDailyTrend(rows)` is typed `AnalyticsRow[]` but only touches
  `row.createdAt`. Widening the parameter to `{ createdAt: string }[]` makes
  it reusable for subscribers with no behaviour change and no new code.
- `paginateRows<T>` is already generic — reusable as-is.
- `TrendChart` hardcodes the series label `"Submissions"`. Needs an optional
  `label` prop defaulting to today's value, so the quiz chart is untouched.
- `getAnalyticsRows()` returns `null` on failure and the page maps that to
  `<ConfigError />` plus a `<LogoutButton />` — the same contract the
  subscriber read path should honour.
- The session cookie's path is `/analytics` (`auth.ts`), so nested routes
  inherit it. No cookie or session change is required.
- `submit-panel.tsx` already has the clipboard pattern: `navigator.clipboard
  .writeText(...)` inside a client component, reporting via `toast` from
  `sonner`, with the `<Toaster />` already mounted in the root layout.

## Approach
Three routes, each self-contained. The session gate is repeated in each page
rather than hoisted into `src/app/analytics/layout.tsx`, because a layout
does not re-run on client-side navigation between sibling routes — a page
that trusted the layout could render its data for a request that no longer
has a session. Three explicit checks is the safe shape for an auth gate, and
it keeps `dynamic = "force-dynamic"` colocated with the reason it exists.

Data access stays split by table: the quiz page never touches
`newsletter_subscribers` and vice versa, which is the whole point of the
change.

Everything else is reuse. The subscription chart is the existing
`TrendChart`, fed by the existing `computeDailyTrend` after a type widening;
the table is the existing theme-custom `Table` with the existing
`paginateRows`. The only genuinely new code is the subscriber read path, the
subscriber summary computation, and the copy button.

Rejected: a shared layout gate (unsafe, above); a generic
`<AnalyticsDashboard>` abstraction over both pages (the two have different
tiles, different charts, different tables — the abstraction would be all
branches).

## Files to add / change
**Move / edit**
- `src/app/analytics/page.tsx` — becomes the hub: gate, two links, no fetch.
- `src/app/analytics/quiz/page.tsx` — new; today's dashboard body verbatim.
- `src/components/analytics/participants-table.tsx` — add `basePath` prop.
- `src/components/analytics/trend-chart.tsx` — add optional `label` prop.
- `src/lib/analytics/stats.ts` — widen `computeDailyTrend`'s parameter type.

**New**
- `src/lib/supabase/subscribers.ts` — `getSubscriberRows()`, admin client,
  `null` on failure.
- `src/lib/analytics/subscriber-stats.ts` — `computeSubscriberSummary()`.
- `src/components/analytics/subscribers-table.tsx`
- `src/components/analytics/copy-emails-button.tsx` — `"use client"`.
- `src/app/analytics/subscription/page.tsx`
- Colocated tests for each.

## Contract / data changes
No database changes. No migration. Reads
`newsletter_subscribers(email, status, source, created_at, subscribed_at,
unsubscribed_at)` through the existing admin client.

`SubscriberRow` mirrors `AnalyticsRow`'s shape convention (camelCase, mapped
at the boundary). The trend uses `created_at` — when the row first appeared —
not `subscribed_at`, which moves on re-subscribe and would misreport a
re-subscribe as a new signup.

## Test strategy
- `stats.test.ts` — existing tests must still pass after the widening; add
  one asserting it accepts a bare `{ createdAt }` shape.
- `subscriber-stats.test.ts` — totals, unsubscribed count, source split,
  empty input.
- `subscribers.test.ts` — maps rows; returns `null` on error and on a thrown
  missing-env client.
- `subscribers-table.test.tsx` — renders rows, status, source, empty state,
  pagination links point at `/analytics/subscription`.
- `copy-emails-button.test.tsx` — copies only subscribed addresses,
  newline-joined; states the count; disabled at zero; reports clipboard
  rejection.
- `participants-table.test.tsx` — pagination honours `basePath`.
- Page tests for all three routes: login form without a session, correct
  content with one, config-error on a `null` fetch, and that each page calls
  only its own data function.

## Task checklist
- [x] Widen `computeDailyTrend`; add `label` to `TrendChart`; add `basePath` to `ParticipantsTable`
- [x] `getSubscriberRows()` + test
- [x] `computeSubscriberSummary()` + test
- [x] `SubscribersTable` + test
- [x] `CopyEmailsButton` + test
- [x] `/analytics/quiz` page + test
- [x] `/analytics/subscription` page + test
- [x] `/analytics` hub page + test
- [x] Full `pnpm test && pnpm lint && pnpm typecheck && pnpm build`

## Risks & rollout
- **Bookmarks and history point at `/analytics`.** After this, that URL shows
  the hub rather than the quiz dashboard. Acceptable and intended, but it is
  a behaviour change for the only user.
- **Pagination is the easy thing to break** in a route move; it has its own
  criterion and its own test rather than relying on a manual click.
- **The copy button handles real email addresses.** It writes to the
  clipboard only, never logs them, and is behind the passcode gate like
  everything else here.
- **No migration**, so backout is a straight revert of the branch. Nothing to
  undo in the database.
