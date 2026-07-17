# Spec: Quiz

> The WHAT and WHY. Written/approved by a human before any planning. Keep it in
> `specs/quiz/spec.md`.

## Problem
Students choosing a civil engineering specialization don't have a lightweight,
engaging way to explore which specialization fits their interests. This quiz
turns 7 quick questions into a personalized, shareable recommendation across 7
civil engineering majors, while letting the site owner capture opt-in emails
and analyze aggregate answers over time.

## Goals
- Any visitor can complete a short quiz (7 questions, same 7 underlying
  topics) in either of two formats and get a ranked recommendation.
- Two quiz variants at distinct routes, sharing the same 7 topics and the same
  7 majors:
  - `/quiz` — 4-option single-select multiple choice, fun/casual scenario-based
    questions.
  - `/quiz/scale` — 5-point agree/disagree (Likert) scale, the same 7 topics
    reformatted as statements.
- Results show the top 3 matching majors (name, match %, short description,
  example careers), with ties at the boundary shown in full (list may exceed
  3 entries).
- Every completed result is saved to Supabase anonymously as soon as it's
  computed (no email involved in this save) so that:
  - the result gets a shareable, revisitable permalink at `/result/<id>`,
  - the site owner can later query stored answers/results for aggregate
    analysis (e.g. most common major).
- On the results screen, a separate "Subscribe for updates" email field +
  button lets the user attach their email to their *already-saved* result
  afterward, as an explicit, independent second action — not bundled into
  the initial save. (Revised from an earlier checkbox-based design during
  Implement — see `plan.md` for why.)
- `/` is a landing page introducing the quiz with links to both `/quiz` and
  `/quiz/scale`.
- Both quiz variants use the same one-question-per-screen flow: each screen
  shows exactly one of the 7 questions with Prev/Next buttons, styled per the
  project's design system (`CLAUDE.md` → Design system). No per-question
  URLs — the question index is in-memory client state on a single route
  (`/quiz` or `/quiz/scale`).
- A thin progress bar spans the full width of the viewport, pinned to the
  bottom edge, filled proportionally to how many of the 7 questions are
  answered so far. No numeric label ("3 of 7") — just the fill.
- Next is disabled until the current question has an answer selected. Prev is
  disabled/hidden on the first question. Navigating with Prev/Next preserves
  previously entered answers for the session (going back and forth doesn't
  lose answers).
- On the last question, the primary action becomes "Submit" (instead of
  "Next"), which computes and shows the results.
- The experience is fully anonymous — no accounts, no login. An email is only
  ever attached to a result if the user explicitly opts in.

## Non-goals
- No user accounts or quiz history across sessions/devices.
- No admin/analytics dashboard UI — aggregate analysis happens by querying
  Supabase directly, not through a built UI.
- No multi-language support (English only for v1).
- No admin UI for editing questions/weights — question content and scoring
  weights are hardcoded in the codebase.
- No resuming an in-progress (unsubmitted) quiz across page reloads — only
  completed results are persisted.

## Users / scenarios
A student unsure which civil engineering specialization to pursue opens the
site, picks a quiz format, answers 7 questions in a couple of minutes on
their phone or laptop, and gets a personalized top-3 recommendation with
percentages. They can share the result link with friends, retake the quiz, or
optionally leave their email to get updates from the site owner.

## Acceptance criteria
> These must be testable. Verify checks each one PASS/FAIL.
- [ ] Given a user completes all 7 questions on `/quiz` (multiple choice) and
      submits, then the results screen shows the top 3 majors ranked by match
      percentage, each with name, percentage, short description, and example
      careers.
- [ ] Given a user completes all 7 questions on `/quiz/scale` (Likert) and
      submits, then results are computed and displayed the same way as the
      multiple-choice variant.
- [ ] Given each major's match percentage is `(raw weighted score ÷ that
      major's max possible score) × 100`, when results are computed, then
      each of the 7 majors has an independent percentage (percentages do not
      need to sum to 100).
- [ ] Given two or more majors are tied at the cutoff for the 3rd result slot,
      when results are shown, then all tied majors are included (the
      displayed list may be longer than 3).
- [ ] Given a completed quiz, when the result save to Supabase succeeds, then
      a shareable permalink `/result/<id>` is generated that, when visited,
      displays the same result (majors, percentages, descriptions, careers).
- [ ] Given a completed quiz, when the Supabase save fails (e.g. network
      error), then the result is still shown to the user immediately from the
      client-computed data, and the save is retried a few times in the
      background without blocking or erroring the UI.
- [ ] Given the results screen, when the user enters a validly formatted
      email and clicks Subscribe, then that email is saved onto the
      already-persisted result row via an update.
- [ ] Given the results screen, when the user never clicks Subscribe
      (regardless of what's typed in the email field), then no email is
      saved for that result (column left empty).
- [ ] Given an invalid email format, when the user clicks Subscribe, then a
      validation error is shown and no update is sent until it's corrected.
- [ ] Given a result row that already has an email set, when a Subscribe
      update is attempted again for that same id, then it has no effect —
      RLS only allows setting `email` once, from null, never overwriting it.
- [ ] Given the home page (`/`), when a user visits it, then they see an
      introduction and two clear links/buttons to `/quiz` and `/quiz/scale`.
- [ ] Given either quiz variant, when any question is displayed, then exactly
      one question is shown on screen (no scrolling to see a next question),
      with a thin progress bar spanning the full viewport width pinned to the
      bottom, filled proportionally to questions answered (e.g. 3 of 7
      answered → ~43% fill).
- [ ] Given the first question, when it's displayed, then the Prev button is
      disabled or hidden.
- [ ] Given the current question has no answer selected, when viewing it,
      then the Next button is disabled.
- [ ] Given the current question is answered, when the user clicks Next, then
      the quiz advances to the next question and the progress bar fill
      increases accordingly.
- [ ] Given the user answered question N, moved forward, then clicked Prev
      back to question N, when question N is displayed again, then their
      previous answer is still selected.
- [ ] Given the 7th (last) question is answered, when displayed, then the
      primary button reads "Submit" instead of "Next", and clicking it
      computes and shows the results screen.
- [ ] Given a results screen, when the user clicks "Retake", then the quiz
      restarts at question 1 with no prior answers retained.
- [ ] Given a public `/result/<id>` permalink, when the page is loaded (HTML,
      network payloads, page source), then the associated email address (if
      any was saved) is never present in what's sent to the browser.

## Edge cases
- All 7 questions must be answered before results can be computed — no
  partial submission.
- Refreshing or closing the tab mid-quiz loses in-progress answers (expected,
  per non-goals — only completed results are persisted).
- A tie can occur at any rank inside the top 3, not just 3rd place; the rule
  ("show all tied majors") applies wherever it occurs.
- If the Supabase save ultimately fails after retries, the in-browser result
  still displays correctly, but `/result/<id>` for that attempt may 404 later
  — visiting an unknown/failed result id shows a friendly "not found" state.
- Email is present in the input but Subscribe is never clicked: email is
  discarded, not saved. The base result save never includes email at all —
  it's only ever attached via the separate Subscribe update.
- Malformed email blocks the Subscribe update (inline validation error) but
  never blocks or delays the base result save/permalink, since the two are
  fully independent actions now.
- Since question steps are client state on a single route (not per-question
  URLs), the browser's back/forward buttons navigate away from the quiz page
  entirely rather than stepping between questions — only the in-app Prev/Next
  controls move between questions. This is expected, not a bug.

## Constraints & dependencies
- Backend: Supabase (Postgres), using `@supabase/supabase-js`. Connection
  details (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) come from environment
  variables, never hardcoded or committed — consistent with the existing
  `.env*` gitignore rule and the `scan-secrets` PreToolUse hook.
- Row-Level Security must be configured so the public `/result/<id>` read
  path never exposes the `email` column, regardless of how the row was
  written (e.g. a public view/RPC that excludes `email`, or a server-side
  route that strips it). Exact mechanism is a Plan-phase decision.
- Anonymous UPDATE (for the Subscribe flow) is scoped as narrowly as
  possible: `anon` is only granted UPDATE on the `email` column specifically
  (not the whole row), and RLS only permits the update while the row's
  `email` is still null — so a result can be subscribed at most once, never
  overwritten or cleared by a replayed/malicious request.
- No accounts/auth — all Supabase writes/reads on this feature are anonymous.
- Must fit existing conventions from `CLAUDE.md`: Next.js 16 App Router,
  TypeScript strict, Tailwind v4 + shadcn/`@base-ui/react` components, quiz
  domain logic (question data, scoring, matching) lives in `src/lib/`.
- English only, no i18n in this version.
- The 7 majors: Structural Engineering, Geotechnical Engineering,
  Transportation Engineering, Environmental Engineering, Water Resources
  Engineering, Construction Management, Disaster Risk Reduction Engineering.

## Open questions
- None blocking. Assumptions baked into this spec that you should flag if
  wrong: all 7 questions are required (no skipping), in-progress quiz state
  is never persisted (only completed results), and the exact wording/weights
  of the 7 questions and their per-major weights will be drafted by Claude
  and reviewed by you before/during the Plan phase.
