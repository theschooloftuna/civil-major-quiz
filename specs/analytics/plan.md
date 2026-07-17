# Plan: Analytics page

> The HOW. Produced from the approved spec during the Plan phase, after the
> Explore subagent has investigated the codebase. Approved by a human before
> implementation. Lives in `specs/<feature-slug>/plan.md`.

## Spec
Link: `specs/analytics/spec.md`

## Codebase findings
> What Explore learned about how the relevant code works today.
- **Supabase client (`src/lib/supabase/client.ts`)** is anon-key-only by
  explicit doc-comment contract ("never a service-role key") — a new admin
  client must be a *separate* module, not a change to this one. It follows a
  strict pattern worth copying exactly: module-level singleton, `import
  "server-only"`, throw-if-env-missing, and every call site wraps the call in
  try/catch and degrades to `null`/`false` rather than crashing.
- **No auth/session scaffolding exists at all**: no `cookies()`/`headers()`
  usage anywhere, no `middleware.ts`/`proxy.ts`, no Route Handlers. This is
  greenfield.
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (exports `proxy`, not
  `middleware`); the file convention is deprecated-but-working under the old
  name. Since there's zero existing middleware/proxy usage, and Next's own
  docs warn that Proxy-only gating can silently stop covering a route after a
  refactor, we gate `/analytics` inside the page/Server Action itself
  (belt-and-suspenders is unnecessary here — it's the *only* protected
  route), avoiding introducing the first proxy.ts in the repo.
- **`cookies()` is async in this Next version** and `.set()`/`.delete()` are
  only valid inside a Server Function or Route Handler, not during Server
  Component render — login/logout must go through Server Actions.
- **Closest existing "form + server-side write" pattern**:
  `src/lib/supabase/actions.ts` (`"use server"` file-level directive,
  functions that never throw, always return a discriminated result object)
  paired with `src/components/quiz/submit-panel.tsx` (`"use client"`, local
  `useState` for value/error/pending, no `useFormState`/`useActionState`
  anywhere in this codebase). The login form should mirror this exactly.
- **`src/components/theme-custom/`** has `button.tsx`, `input.tsx`,
  `field.tsx`, `alert.tsx`, `doodles.tsx`, `toaster.tsx` — no `card.tsx` or
  `table.tsx`, and no such primitive exists under `ui/` either. Both need to
  be added via `pnpm dlx shadcn add <name>` per the golden rule, then wrapped
  in `theme-custom/`.
- **No charting library is installed.** `globals.css` already defines unused
  shadcn chart tokens `--chart-1..5` (green/acid/blue/orange/purple) wired
  into `@theme inline` as `--color-chart-1..5` — these exist specifically to
  back shadcn's `chart.tsx` primitive (built on `recharts`). Running `pnpm
  dlx shadcn add chart` is the natural fit: it adds `recharts` as a
  dependency and installs `ui/chart.tsx` pre-wired to consume those exact
  tokens, rather than hand-picking an unrelated charting lib.
- **`src/app/result/[id]/page.tsx` + `not-found.tsx`** is the template for a
  Server Component that fetches via a data function that never throws, then
  branches on a sentinel (`null`) — the same shape the analytics page uses
  for its "service role key not configured" and "zero participants" states.
- **Test conventions**: `vi.mock` the sibling client module (not the SDK)
  with a chained builder matching the exact query chain used in the source;
  top-level `await import(...)` after the mock so it applies; `vitest.setup.ts`
  globally mocks `"server-only"` (already covers any new server-only module,
  no per-file action needed) and runs RTL `cleanup()`. No test currently
  mocks `next/headers` — new test files touching cookies will need their own
  local `vi.mock("next/headers", ...)`.
- **Schema** (`supabase/migrations/`): `quiz_results` has RLS with an
  insert-only anon policy and no anon select at all on the base table;
  `quiz_results_public` (view, no `email` column) is the only anon-readable
  path. This confirms a service-role client is a hard requirement, not a
  convenience — the existing anon client structurally cannot serve this
  feature. No new migration is needed since the service-role key bypasses
  RLS on the existing table.

## Approach
Gate the single route `/analytics` entirely inside the page + a pair of
Server Actions — no `proxy.ts`. The page checks a signed session cookie: if
absent/invalid/expired, render a `"use client"` login form (mirroring
`submit-panel.tsx`); on success, an action verifies the passcode
(`ANALYTICS_PASSCODE`), sets a signed httpOnly cookie, and the client calls
`router.refresh()` so the Server Component re-renders past the gate.

The cookie is signed with a small hand-rolled HMAC-SHA256 helper (Node's
built-in `crypto`, no new dependency) rather than a session library —
justified because the payload is trivial (just an expiry timestamp; there's
no user identity, roles, or data to encrypt, just "is this a holder of the
passcode within the last 30 days"). The signing secret is
**`ANALYTICS_PASSCODE` itself**, not a separate secret: this means rotating
the passcode (changing one env var) automatically invalidates every
outstanding session, which is a desirable property for a shared-secret
scheme and avoids a second secret to provision and document.

Data access: a new `getSupabaseAdminClient()` (service-role key, mirrors
`getSupabaseClient()`'s exact shape/contract) fetches all rows from
`quiz_results` with only the columns the dashboard needs (`id, created_at,
variant, top_majors, email` — never `answers`/`scores`, which aren't used
here). All aggregation (totals, variant split, opt-in rate, major
distribution, 30-day daily trend, pagination) is done by **pure functions in
`src/lib/analytics/stats.ts`**, not SQL — the dataset is small (personal quiz
app scale) and this keeps every aggregate independently unit-testable
without mocking Supabase, per the existing "domain logic in `src/lib/`,
framework-agnostic" architecture rule. The page fetches once per request and
both computes stats and slices the current page from the same row array, so
there's exactly one DB round trip for the whole dashboard.

Pagination and chart interactivity stay server-rendered where possible:
table pagination is plain `<Link href="/analytics?page=N">` (no client JS),
consistent with "Server Components by default." Only the two charts
(`recharts` requires a client boundary) and the login form need `"use
client"`.

The "service role key not configured" and "zero participants" states are
distinct (per spec, unlike `result/[id]`'s collapsed 404 state): the data
function returns `null` on any fetch/config failure (mirroring
`getQuizResultById`'s contract) vs. `[]` for a genuinely empty table, and the
page branches on that distinction to show the right message.

## Files to add / change
- `.env.example` — add `SUPABASE_SERVICE_ROLE_KEY`, `ANALYTICS_PASSCODE`.
- `CLAUDE.md` — extend "Environment variables" section with the two new
  vars and a one-line note on what they gate.
- `src/lib/supabase/admin-client.ts` — new. `getSupabaseAdminClient()`,
  service-role key, mirrors `client.ts` exactly (singleton, `server-only`,
  throw-if-missing).
- `src/lib/supabase/analytics.ts` — new, `server-only`. `AnalyticsRow` type
  + `getAnalyticsRows(): Promise<AnalyticsRow[] | null>` — selects the four
  needed columns ordered by `created_at desc`, catches admin-client
  construction/query errors and returns `null` (same contract as
  `getQuizResultById`).
- `src/lib/analytics/stats.ts` — new, pure, framework-agnostic.
  - `computeSummary(rows)` → `{ total, choiceCount, scaleCount, optInCount,
    optInPercentage }`
  - `computeMajorDistribution(rows)` → all 7 majors (from `MAJORS`), each
    `{ majorId, name, count, percentage }`, sorted by count desc, using each
    row's *highest-percentage* `top_majors` entry (first entry, since
    `getTopMajors` output is stored pre-sorted descending — matches the
    spec's tie-handling edge case).
  - `computeDailyTrend(rows, { days: 30, now })` → 30 entries (oldest→newest,
    UTC calendar day), zero-filled for days with no submissions.
  - `paginateRows(rows, page, pageSize)` → `{ pageRows, totalPages,
    currentPage }`, clamps out-of-range pages.
- `src/lib/analytics/session.ts` — new, pure. `createSessionToken(secret,
  expiresAtMs)` / `verifySessionToken(token, secret, nowMs)` — HMAC-SHA256
  over the expiry timestamp, timing-safe comparison, rejects tampered or
  expired tokens.
- `src/lib/analytics/auth.ts` — new, `server-only`. Next-coupled glue:
  `ANALYTICS_SESSION_COOKIE` name constant, `hasValidAnalyticsSession():
  Promise<boolean>` (reads the cookie via `cookies()`, delegates to
  `verifySessionToken`).
- `src/lib/analytics/actions.ts` — new, `"use server"`.
  `loginToAnalytics(passcode: string): Promise<{ success: boolean }>` (checks
  against `ANALYTICS_PASSCODE`, sets the signed cookie on success — 30-day
  `maxAge`, `httpOnly`, `sameSite: "lax"`, `secure` in production, `path:
  "/analytics"`); `logoutFromAnalytics(): Promise<void>` (deletes the
  cookie) — used directly as a `<form action={logoutFromAnalytics}>` target,
  no client component needed for logout.
- `src/components/ui/table.tsx`, `src/components/ui/card.tsx`,
  `src/components/ui/chart.tsx` — new, via `pnpm dlx shadcn add table card
  chart` (also adds `recharts` to `package.json`). Never hand-edited past
  what the CLI generates.
- `src/components/theme-custom/table.tsx` — new. Styled wrapper (moss
  border, existing shadow language) around `ui/table.tsx`.
- `src/components/theme-custom/card.tsx` — new. Styled wrapper around
  `ui/card.tsx` for stat tiles / chart containers.
- `src/components/theme-custom/chart.tsx` — new. Thin re-export of
  `ui/chart.tsx`'s pieces (`ChartContainer`, `ChartTooltip`, etc.), centralizing
  the import point per the golden rule; no behavior changes.
- `src/components/analytics/login-form.tsx` — new, `"use client"`. Mirrors
  `submit-panel.tsx`: passcode `Input` + `Button`, local pending/error state,
  calls `loginToAnalytics`, `router.refresh()` on success.
- `src/components/analytics/logout-button.tsx` — new. Plain Server Component
  `<form action={logoutFromAnalytics}>` + themed `Button` (`type="submit"`).
- `src/components/analytics/stat-tile.tsx` — new. Server Component; label +
  value (+ optional percentage) on a themed `Card`.
- `src/components/analytics/major-distribution-chart.tsx` — new, `"use
  client"`. Bar chart (recharts via `theme-custom/chart.tsx`), 7 majors,
  count + percentage.
- `src/components/analytics/trend-chart.tsx` — new, `"use client"`. 30-day
  daily submission count chart.
- `src/components/analytics/participants-table.tsx` — new. Server Component;
  renders one page of rows (timestamp, variant, top major, email-or-blank) +
  prev/next `Link`s using `?page=`.
- `src/components/analytics/config-error.tsx` — new. Small Server Component
  message for the "service role key not configured" state, styled like
  `not-found.tsx`'s centered-message pattern.
- `src/app/analytics/page.tsx` — new. Server Component; reads `searchParams`
  (`Promise<{ page?: string }>`, Next 16 convention), checks
  `hasValidAnalyticsSession()`; renders `LoginForm` if false; else calls
  `getAnalyticsRows()` and branches: `null` → `ConfigError`, `[]` or
  populated → dashboard (stat tiles, both charts, participants table,
  logout button).

## Contract / data changes
- No database migration. Reads `public.quiz_results` directly via a new
  service-role client, bypassing RLS (RLS is unaffected/unchanged for the
  anon path).
- Two new required env vars for this feature: `SUPABASE_SERVICE_ROLE_KEY`,
  `ANALYTICS_PASSCODE`. Neither is prefixed `NEXT_PUBLIC_`; both stay
  server-only.
- New signed cookie: `analytics_session` (httpOnly, 30-day `maxAge`, scoped
  to `path: "/analytics"`), value = `<expiresAtMs>.<hmacHex>`.

## Test strategy
- **`src/lib/analytics/session.test.ts`** — valid token round-trips; tampered
  signature rejected; expired token rejected; wrong secret rejected.
- **`src/lib/analytics/stats.test.ts`** —
  - `computeSummary`: mixed variants/opt-ins sum correctly; zero rows → all
    zeros (AC: zero-participant state).
  - `computeMajorDistribution`: all 7 majors present even with zero
    occurrences; counts sum to participant count; tie-in-`top_majors[0]`
    handled by taking the first (highest) entry (AC: tied top match).
  - `computeDailyTrend`: 30 entries even with sparse data; a day with zero
    submissions appears as a zero point, not a gap (AC: trend zero-fill).
  - `paginateRows`: full pages, partial last page, out-of-range page
    clamps (AC: pagination at last/partial page).
- **`src/lib/analytics/actions.test.ts`** (mocks `next/headers`
  `cookies()`) — correct passcode sets cookie and returns `success: true`;
  incorrect passcode returns `success: false` and sets no cookie (AC: wrong
  passcode re-shows form, no session); `logoutFromAnalytics` deletes the
  cookie.
- **`src/lib/analytics/auth.test.ts`** — valid cookie → true; missing
  cookie → false; expired cookie → false (AC: expired session ⇒ passcode
  form again).
- **`src/lib/supabase/analytics.test.ts`** (mocks `./admin-client`, same
  chained-builder pattern as `quiz-results.test.ts`) — happy path returns
  mapped rows; admin client construction throwing → returns `null`, not a
  throw (AC: missing service-role key ⇒ config-error state, not a crash).
- **`src/app/analytics/page.test.tsx`** (mocks `@/lib/analytics/auth` and
  `@/lib/supabase/analytics`) —
  - no session → renders login form, no stats/table visible.
  - valid session + `getAnalyticsRows` → `null` → renders config-error
    message.
  - valid session + `[]` → renders zero-state (0 counts, empty chart/table
    states).
  - valid session + populated rows → totals, variant split, opt-in %, all 7
    majors in the distribution, correct page of the participant table.
- **`src/components/analytics/login-form.test.tsx`** — submitting shows
  pending state; on `success: false` shows an inline error and stays on the
  form (AC: wrong passcode error); on `success: true` triggers refresh.
- Every acceptance criterion in `specs/analytics/spec.md` is covered by at
  least one test above; the config-error and zero-state criteria are each
  covered at both the unit (`stats.ts`/`analytics.ts`) and integration
  (`page.test.tsx`) level since they're the two states most likely to
  regress silently.

## Task checklist
> Implement works these top-to-bottom, committing after each.
- [x] Add `SUPABASE_SERVICE_ROLE_KEY` / `ANALYTICS_PASSCODE` to
      `.env.example` and `CLAUDE.md`; add `src/lib/supabase/admin-client.ts`.
- [x] Add `src/lib/analytics/session.ts` + tests.
- [x] Add `src/lib/analytics/auth.ts` + `src/lib/analytics/actions.ts` +
      their tests (mocking `next/headers`).
- [x] Add `src/lib/supabase/analytics.ts` (`getAnalyticsRows`) + tests.
- [x] Add `src/lib/analytics/stats.ts` (summary/distribution/trend/paginate)
      + tests — the bulk of the business-logic surface, build this out fully
      before touching UI.
- [x] `pnpm dlx shadcn add table card chart`; add
      `theme-custom/{table,card,chart}.tsx` wrappers.
- [x] Add `analytics/login-form.tsx` + `analytics/logout-button.tsx` +
      `analytics/config-error.tsx`.
- [x] Add `analytics/stat-tile.tsx`, `analytics/major-distribution-chart.tsx`,
      `analytics/trend-chart.tsx`, `analytics/participants-table.tsx`.
- [x] Add `src/app/analytics/page.tsx` wiring gate → fetch → dashboard;
      add `page.test.tsx` covering all four render states.
- [ ] Manual pass: `pnpm dev`, walk through wrong passcode → correct
      passcode → dashboard → logout → session persists across reload →
      pagination at last page, against a real (or seeded) Supabase project.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Risks & rollout
- **Passcode-as-signing-secret coupling**: rotating `ANALYTICS_PASSCODE`
  silently logs out every session (by design) — worth a one-line comment at
  the definition site so a future edit doesn't "fix" it into a bug.
- **Service-role key blast radius**: this key bypasses RLS entirely. It must
  never be imported outside `server-only`-tagged modules and never passed to
  a Client Component. Mitigated by mirroring `client.ts`'s existing
  `server-only` contract exactly and keeping it in exactly one new file
  (`admin-client.ts`).
- **No rate limiting on passcode attempts** (explicit non-goal) — acceptable
  for a low-traffic personal tool per your call in Specify; revisit if this
  ever gets a real URL shared beyond you.
- **In-memory aggregation over all rows on every request**: fine at current
  scale; if `quiz_results` grows large enough for this to matter, the first
  fix is an index on `created_at` (no index is added in this pass) and/or
  moving aggregates to SQL — flagged, not built, since it's premature now.
- **New dependency**: `recharts` (via `shadcn add chart`) is the only new
  runtime dependency this feature introduces.
- No feature flag / staged rollout needed — this is a new, isolated route
  with no impact on existing quiz flows; safe to ship in one PR.
