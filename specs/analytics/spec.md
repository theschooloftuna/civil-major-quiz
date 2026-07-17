# Spec: Analytics page

> The WHAT and WHY. Written/approved by a human before any planning. Keep it in
> `specs/<feature-slug>/spec.md`.

## Problem
The quiz has no way to see how it's actually performing: how many people have
taken it, whether participation is growing or fading, which majors the quiz
tends to recommend, and who opted in for email follow-up. The site owner
needs a single page to check these numbers instead of querying Supabase by
hand.

## Goals
- A passcode-gated `/analytics` page showing:
  - Total participant count (all-time).
  - Quiz variant split (choice vs. scale) as counts/percentages.
  - Email opt-in rate (count/percentage of participants who subscribed).
  - Major-match distribution: a bar chart of how often each of the 7 majors
    appears as a participant's top match, count + percentage, all 7 shown.
  - A daily participation trend chart for the last 30 days (submission count
    per day).
  - A paginated table of individual participants (newest first) showing:
    submission timestamp, quiz variant, top major, and email (shown if the
    participant opted in, otherwise blank).
- Access is gated by a shared passcode (not full user auth): a login form
  sets a signed, httpOnly session cookie valid 30 days; a logout control
  clears it.
- Server-side data access uses a new `SUPABASE_SECRET_KEY` (server-only)
  to read `quiz_results` directly, including `email` — bypassing RLS, since
  the existing anon key/view intentionally cannot read `email` or the base
  table.

## Non-goals
- No CSV/data export.
- No search or filtering on the participant table (e.g. by variant or major)
  at launch.
- No per-question / per-answer analytics breakdown.
- No real multi-user authentication (no accounts, roles, or password
  reset) — a single shared passcode is sufficient.
- No editing or deleting of participant rows from this page.
- No rate limiting on passcode attempts.
- No analytics beyond what's listed in Goals (e.g. no geographic data, no
  referrer tracking — none of that is currently collected).

## Users / scenarios
- The site owner visits `/analytics`, enters the shared passcode once, and
  gets a 30-day session. On return visits within that window they land
  directly on the dashboard.
- The owner scans the page after sharing the quiz link somewhere, to see the
  daily trend chart spike and check the running total.
- The owner scrolls the participant table to find recent opted-in emails to
  follow up with.

## Acceptance criteria
> These must be testable. Verify checks each one PASS/FAIL.
- [ ] Visiting `/analytics` without a valid session shows a passcode entry
      form and no participant data.
- [ ] Submitting the correct passcode sets a signed, httpOnly session cookie
      and redirects to the analytics dashboard.
- [ ] Submitting an incorrect passcode re-shows the form with a visible error
      message and does not set a session cookie.
- [ ] With a valid session, `/analytics` renders without re-prompting for the
      passcode.
- [ ] A logout control is present and, when used, clears the session cookie
      and returns the user to the passcode form on next visit.
- [ ] The dashboard shows total participant count matching the row count of
      `quiz_results`.
- [ ] The dashboard shows variant split (choice vs. scale) as counts and
      percentages that sum to the total participant count.
- [ ] The dashboard shows email opt-in rate as a count and percentage of
      total participants.
- [ ] The dashboard shows a bar chart with all 7 majors, each with a count
      and percentage of participants whose top match includes that major.
- [ ] The dashboard shows a daily trend chart covering the last 30 days,
      with one data point per day (including days with zero submissions).
- [ ] The participant table is sorted newest-first, paginated (fixed page
      size), and each row shows timestamp, variant, top major, and email
      (blank if not opted in).
- [ ] If `SUPABASE_SECRET_KEY` is not configured, `/analytics` (after
      passcode entry) shows a clear "analytics unavailable" message instead
      of crashing or showing a generic error page.
- [ ] With zero participants in the database, the dashboard renders with
      zeroed-out stats and empty chart/table states instead of erroring.

## Edge cases
- Zero participants (fresh/empty database): stats show 0, charts render
  empty states, table shows an empty state, not an error.
- A day in the 30-day trend window with zero submissions still appears as a
  zero-value point, not a gap.
- A participant with a tied top match (more than one major at the highest
  score) — table shows only the single highest-scored major per the
  existing `top_majors` ordering (first entry).
- Missing/misconfigured `SUPABASE_SECRET_KEY` at runtime: page shows a
  config-error state (post-passcode), not a crash.
- Expired session cookie: treated the same as no session — passcode form is
  shown again.
- Participant count large enough to span many pages: pagination controls
  must still work correctly at the last page (partial page of results).

## Constraints & dependencies
- New env var `SUPABASE_SECRET_KEY` (server-only, never sent to the
  client) — must be documented in `.env.example` and the CLAUDE.md
  environment variables section. This key bypasses RLS entirely, so all
  code using it must live in server-only modules (`import "server-only"`,
  following the existing pattern in `src/lib/supabase/quiz-results.ts`).
- New env var for the shared passcode (e.g. `ANALYTICS_PASSCODE`), server-
  only, used to validate login attempts.
- Session cookie must be signed (e.g. HMAC'd or otherwise tamper-evident)
  and httpOnly so it can't be forged or read via client-side JS.
- Reads directly from `public.quiz_results` (the base table), not
  `quiz_results_public` — this is the only reason a service role key is
  needed instead of the existing anon client.
- Depends on existing `top_majors`/`scores` JSON shape produced by
  `src/lib/scoring.ts` and stored per submission.
- No new database migration is anticipated (service role bypasses RLS on
  existing tables), but Plan should confirm indexing on `created_at` is
  sufficient for the trend query and pagination at expected data volumes.

## Open questions
- None — resolved during this interview. Plan phase should still confirm
  the exact passcode-cookie signing mechanism (e.g. Next.js
  `cookies()`/`crypto` approach compatible with Next.js 16) and the charting
  library choice (consult the `dataviz` skill during implementation).
