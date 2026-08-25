# Spec: Split analytics into quiz and subscription dashboards

## Problem
`/analytics` loads every `quiz_results` row (236 today, growing with every
completion) to render one page. There is no way to look at the newsletter
list at all — checking who subscribed means pulling the entire quiz dataset
and then not finding the answer, because subscribers live in a different
table that the dashboard never reads.

With the first newsletter issue days away, the subscriber list is the thing
that needs checking most often and is the only thing not visible.

## Goals
- `/analytics` becomes a hub: two entry points, and no data fetching at all.
- `/analytics/quiz` carries today's dashboard, unchanged in behaviour.
- `/analytics/subscription` shows subscriber counts, a daily-signups chart,
  and a table of everyone on the list with their status and source.
- One button copies every currently-subscribed address to the clipboard, so
  the list can be pasted into whichever sender gets chosen.
- Opening either dashboard reads only the table it needs.

## Non-goals
- Editing, deleting, or manually adding subscribers from the dashboard.
- CSV/file export. Clipboard only.
- Correlating a subscriber with their quiz result — the two tables are
  joined by nothing, deliberately.
- Any change to the passcode, session, or cookie model.
- Sending email.

## Users / scenarios
- **The owner** opens `/analytics`, picks Subscription, and sees the list
  without waiting on quiz data.
- **The owner** hits Copy, pastes 53 addresses into a sending tool.
- **The owner** notices the unsubscribed count climbing after an issue goes
  out, and can see who left and when.

## Acceptance criteria
### Hub
- [ ] `GET /analytics` renders links to `/analytics/quiz` and `/analytics/subscription`.
- [ ] The hub fetches no rows from either table — no quiz query, no subscriber query.
- [ ] Without a valid session, the hub renders the login form instead.

### Quiz dashboard
- [ ] `GET /analytics/quiz` renders the same tiles, charts, and participants table that `/analytics` rendered before this change.
- [ ] Its pagination links point at `/analytics/quiz?page=N`, not `/analytics?page=N`.
- [ ] It reads `quiz_results` and does not query `newsletter_subscribers`.

### Subscription dashboard
- [ ] `GET /analytics/subscription` renders tiles for total subscribed, unsubscribed, and the split by source.
- [ ] It renders a 30-day chart of **new** subscribers per day, zero-filled, using the same component as the quiz participation chart.
- [ ] It renders a table of every subscriber — subscribed and unsubscribed alike — showing email, status, source, and the relevant timestamp.
- [ ] The table is paginated on the same terms as the participants table, with links pointing at `/analytics/subscription?page=N`.
- [ ] A copy button copies **only currently-subscribed** addresses, newline-separated, and reports success.
- [ ] The copy button states how many addresses it will copy.
- [ ] It reads `newsletter_subscribers` and does not query `quiz_results`.

### Auth & failure
- [ ] Each of the three routes independently verifies the session. The gate is **not** delegated to a shared layout: a layout does not re-run on client-side navigation between sibling routes, so a page relying on it could render for an unauthenticated request.
- [ ] Each route sets `dynamic = "force-dynamic"` explicitly, for the reason already documented on the existing page — implicit dynamic detection was observed serving this route from a stale static cache in production.
- [ ] When the subscriber query fails or env vars are missing, the subscription page renders the existing config-error state with a working logout, never an unhandled crash.
- [ ] With zero subscribers, the page renders empty states rather than erroring.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.

## Edge cases
- A subscriber who unsubscribed and re-subscribed appears once, as subscribed.
- Pagination page numbers out of range clamp, as they already do.
- Copy is unavailable or denied by the browser — the button reports failure
  rather than silently doing nothing.
- Zero subscribed addresses — the copy button is disabled rather than
  copying an empty string.

## Constraints & dependencies
- Subscriber rows are readable only with `SUPABASE_SECRET_KEY`; migration
  0007 revoked the anon and authenticated grants, so the admin client is the
  only path.
- The analytics session cookie is scoped to path `/analytics`, so both
  sub-routes are already covered with no cookie change.
- Reuses `computeDailyTrend`, `paginateRows`, `TrendChart`, `StatTile`, and
  the theme-custom `Table` rather than adding parallel implementations.
- Clipboard writes require a Client Component; everything else stays a
  Server Component.

## Open questions
- None. Table scope (everyone, with status), graph metric (new per day), and
  the bulk copy button were settled during the Specify interview.
