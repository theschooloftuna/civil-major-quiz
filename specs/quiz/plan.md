# Plan: Quiz

> The HOW. Produced from the approved spec during the Plan phase, after the
> Explore subagent has investigated the codebase. Approved by a human before
> implementation. Lives in `specs/quiz/plan.md`.

## Spec
Link: `specs/quiz/spec.md`

## Codebase findings
- The repo is a near-empty Next.js 16 App Router scaffold. Everything the
  quiz needs is net-new — only `src/app/{layout,page,globals.css}`,
  `src/components/ui/button.tsx` (+ its test), and `src/lib/utils.ts` exist.
- `button.tsx` is the one existing component and sets the pattern to copy:
  wraps a `@base-ui/react` primitive, variants via `cva`, styled only through
  `cn(buttonVariants({...}))`, `data-slot="..."` attribute, function
  declaration with a named export, hard-edged theme baked into base classes
  (`border-foreground`, `shadow-hard-sm`, `active:*` press-in-shadow
  interaction). New interactive components (option cards, scale selector,
  progress bar) should follow this shape.
- `globals.css` design tokens to build on: `--primary` (#1fa647 green),
  `--accent` (#c4e456 acid), `--border`/`--foreground` (#343330 stone, used
  for crisp borders), `shadow-hard-sm|hard|hard-lg` utilities, `--radius:
  0.5rem`. Light mode only, no `.dark` block.
- `components.json` confirms `iconLibrary: "phosphor"` and pre-declares a
  `hooks: "@/hooks"` alias even though `src/hooks/` doesn't exist yet —
  that's the intended home for a quiz-flow state hook.
- Nothing Supabase-, form-, or validation-related is installed
  (`@supabase/supabase-js`, `zod`, `react-hook-form` all absent). No
  `.env*` file or `process.env` usage exists anywhere — there's no
  precedent to follow, this plan establishes the pattern.
- **CLAUDE.md inconsistency found:** its Mission line still says "6
  options" for majors; the approved spec correctly settled on 7. Fixing
  this is folded into the task checklist below (trivial doc correction).
- Confirmed against `node_modules/next/dist/docs` for this Next.js version
  (since AGENTS.md warns training data may be stale): Server Actions
  (`'use server'`), Route Handlers, and env var loading (`.env.local`,
  `NEXT_PUBLIC_` prefix for browser exposure) all work as expected, no
  breaking changes affecting this feature. Server Actions are POST-reachable
  by anyone regardless of UI gating, so server-side validation inside the
  action is required, not optional (the docs explicitly call this out).

## Approach
**Data & scoring are pure `src/lib` modules, tested in isolation.** The 7
majors and 7 question topics are defined once; each variant (`choice`,
`scale`) has its own question content keyed to the same 7 `topicId`s, so a
test can assert the two variants stay in sync on topic coverage. A single
`computeResults()` function scores either variant's answers into per-major
`{ raw, max, percentage }`, and `getTopMajors()` returns the top 3 with all
ties at the cutoff included — both pure functions, no React/Next
dependency, matching CLAUDE.md's "components only render" rule.

**Quiz flow state is a client hook, not routes.** Per the approved spec,
question index + answers live in `useQuizFlow` (client-only state, no
per-question URLs). A single `QuizFlow` client component renders one
question at a time inside a shared layout (question card + Prev/Next +
bottom-pinned thin progress bar), switching between a multiple-choice
option-card renderer and a 5-point scale renderer based on a `variant` prop.
On the last question, Next becomes Submit, which runs `computeResults()`
locally and immediately shows the results view — no waiting on the network.

**Supabase is server-only; the browser never gets its own client or keys.**
All reads and writes go through Next.js server code:
- **Write:** a Server Action (`'use server'`) takes the client-computed
  answers/scores, re-validates the email format server-side (defense in
  depth — the docs are explicit that render-time validation isn't a
  security boundary), generates the row's `id` (or accepts a client-supplied
  UUID so the share link can be shown before the save confirms), and inserts
  using the **anon key** (not a service-role key) so Postgres RLS is the
  real enforcement boundary even if someone calls the action directly.
- **Read:** `/result/[id]` is an async Server Component that queries a
  Postgres **view that excludes the `email` column entirely** — the
  strongest form of the spec's "email must never reach the browser"
  requirement, since the column is unreachable at the SQL level, not just
  filtered in application code.
- This sidesteps ever needing a `NEXT_PUBLIC_`-prefixed Supabase key.

**Save failure is invisible to the user, per spec.** `QuizFlow` shows the
result from local state immediately, then fires the Server Action in a
background `useEffect`/transition. If it fails, it retries a few times with
a short backoff; if it never succeeds, the "Copy link" affordance simply
shows a small "link isn't ready" state instead of a link — the
recommendation itself is never blocked or hidden.

**REVISED during Implement — email is a separate action, not bundled into
the save.** The original plan had `saveQuizResult` accept an optional
`email` and fire once, automatically, right after results appear. That
doesn't work: the email opt-in form is on the same screen, and the user
needs time to type into it — an immediate auto-save would almost always go
out before they could. Fixing this by making the two saves independent,
per your direction when I flagged it:
- `saveQuizResult(id, variant, answers, scores, topMajors)` — **no email
  param anymore.** Fires automatically on mount, retried in the background
  exactly as before. This is what makes `/result/<id>` exist.
- `subscribeToUpdates(id, email)` — **new** Server Action, called only when
  the user clicks a "Subscribe" button next to the email field on the
  results screen. Performs an `UPDATE ... SET email = $1 WHERE id = $2`
  against the already-saved row.
- This needs one new piece of the SQL contract beyond what was originally
  approved: a narrowly-scoped anonymous UPDATE (see Contract section below)
  — `anon` can set `email` on a row exactly once, only while it's still
  null, and is granted UPDATE on the `email` column specifically, not the
  whole row.

**Alternative considered and rejected:** letting the browser talk to
Supabase directly with a `NEXT_PUBLIC_` anon key (the typical Supabase
pattern). Rejected because it adds a client bundle dependency and a public
key for zero benefit here — nothing about this feature needs client-side
realtime/subscriptions, and keeping Supabase entirely server-side is simpler
to reason about and matches "Server Components by default."

## Files to add / change

**Domain logic (`src/lib/`, framework-agnostic, unit-tested):**
- `src/lib/majors.ts` — new; the 7 `Major` records (id, name, description,
  careers) and the `MajorId` union type.
- `src/lib/quiz-topics.ts` — new; the 7 shared `topicId`s both variants key
  their questions to.
- `src/lib/quiz-data-choice.ts` — new; 7 multiple-choice questions (4
  options each), each option carrying a per-major weight map.
- `src/lib/quiz-data-scale.ts` — new; 7 Likert statements, each with a
  per-major weight map (agreement scales the contribution toward that
  weight; disagreement scales it toward 0 — no negative scores, keeping the
  "percentage of max possible" formula well-defined for both variants).
- `src/lib/scoring.ts` — new; `computeResults(answers, questions)` and
  `getTopMajors(results, n)` (tie-inclusive). Pure functions.
- `src/lib/supabase/client.ts` — new; server-only Supabase client factory
  reading `SUPABASE_URL` / `SUPABASE_ANON_KEY` from `process.env`.
- `src/lib/supabase/quiz-results.ts` — new; plain server-only module with
  `getQuizResultById(id)` (reads the public view, returns a type with no
  `email` field at all).
- `src/lib/supabase/actions.ts` — new; `'use server'` module with
  `saveQuizResult(input)` (insert, no email) and `subscribeToUpdates(id,
  email)` (the one and only place `email` gets written, via a scoped
  UPDATE).

**Hooks:**
- `src/hooks/use-quiz-flow.ts` — new; current index, answers map,
  `canGoNext`/`canGoPrev`, `answer()`/`next()`/`prev()`/`retake()`.

**Components (`src/components/`, composed, not generated):**
- `src/components/quiz/progress-bar.tsx` — new; thin, full-width, pinned to
  the bottom (`fixed inset-x-0 bottom-0`), fill width driven by a
  `progress: number` (0–1) prop, using `bg-primary` on a `bg-muted` track.
- `src/components/quiz/choice-question.tsx` — new; renders 4 selectable
  option cards for the current MC question.
- `src/components/quiz/scale-question.tsx` — new; renders the 5-point
  agree/disagree control for the current statement.
- `src/components/quiz/quiz-flow.tsx` — new; `"use client"`; the
  orchestrator described in Approach. Takes `variant: "choice" | "scale"`.
- `src/components/quiz/results-list.tsx` — new; renders the top-3(+ties)
  major cards (name, %, description, careers). Reused by both the live
  post-submit view and `/result/[id]`.
- `src/components/quiz/submit-panel.tsx` — new; email opt-in checkbox +
  input with inline validation, retake button, copy-link button — the
  live-submission-only chrome around `results-list`.

**shadcn primitives likely needed beyond `button.tsx`** (added via
`pnpm dlx shadcn add <name>` per CLAUDE.md's "don't hand-edit generated
files" rule, not hand-written):
- `checkbox` (email opt-in consent)
- `input` (email field)

**Routes:**
- `src/app/page.tsx` — rewrite; landing page linking to `/quiz` and
  `/quiz/scale` (replaces the `create-next-app` boilerplate).
- `src/app/quiz/page.tsx` — new; renders `<QuizFlow variant="choice" />`.
- `src/app/quiz/scale/page.tsx` — new; renders `<QuizFlow variant="scale" />`.
- `src/app/result/[id]/page.tsx` — new; async Server Component, calls
  `getQuizResultById`, renders `results-list`, calls `notFound()` if missing.
- `src/app/result/[id]/not-found.tsx` — new; friendly "this result doesn't
  exist" state (covers the failed-save edge case from the spec).

**Config/docs:**
- `package.json` — add `@supabase/supabase-js`.
- `.env.example` — new; `SUPABASE_URL=` / `SUPABASE_ANON_KEY=` with obviously
  fake placeholder values (won't trip `scan-secrets.mjs`, which already
  allowlists `.env.example`).
- `supabase/migrations/0001_quiz_results.sql` — new; see Contract section.
- `CLAUDE.md` — fix "6 options" → "7 majors" in Mission; add a short note
  under Commands/Constraints that `SUPABASE_URL`/`SUPABASE_ANON_KEY` must be
  set in `.env.local` (gitignored) for the quiz feature to persist results.

## Contract / data changes
New Supabase table, RLS policy, and a public view that structurally
excludes `email` (the enforcement mechanism the spec required):

```sql
create extension if not exists pgcrypto; -- for gen_random_uuid()

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  variant text not null check (variant in ('choice', 'scale')),
  answers jsonb not null,
  scores jsonb not null,
  top_majors jsonb not null,
  email text
);

alter table public.quiz_results enable row level security;

-- anon can insert; anon has NO select grant on the base table at all,
-- so email is unreachable through this table regardless of policy bugs.
create policy "anon can insert quiz results"
  on public.quiz_results for insert
  to anon
  with check (true);

-- Public read path: a view that never had an email column to begin with.
create view public.quiz_results_public as
  select id, created_at, variant, answers, scores, top_majors
  from public.quiz_results;

grant select on public.quiz_results_public to anon;
```

**REVISED during Implement — added migration `0002_quiz_results_email_subscribe.sql`:**

```sql
-- Lets a completed result be updated with an opt-in email afterward, via
-- the separate "Subscribe for updates" action on the results screen.
-- Scoped narrowly: anon can only ever set email once (from null), never
-- overwrite or clear it, and can only touch the email column.

create policy "anon can set email once, only while it is still null"
  on public.quiz_results for update
  to anon
  using (email is null)
  with check (email is not null);

grant update (email) on public.quiz_results to anon;
```

The `USING` clause controls which rows are even reachable for update
(only ones with `email is null`); `WITH CHECK` validates the row *after* the
update (must end up non-null). Together they make "set once, never
overwrite" a database-level guarantee, not just an application check. The
column-scoped `grant update (email) ...` means even a crafted request can't
touch `variant`, `answers`, `scores`, or `top_majors` via this policy.

`saveQuizResult`'s return shape: `{ id: string, saved: boolean }` — `saved:
false` means the local result is still valid, just not (yet) shareable. No
`email` field anywhere in its input or output anymore.

`subscribeToUpdates`'s return shape: `{ saved: boolean }` — `false` covers
both a network/query failure and the "email was already set" case (RLS
silently matches zero rows rather than erroring, so from the caller's
perspective both look like "didn't take effect"); the UI doesn't need to
distinguish them, it just doesn't show a success state.

`getQuizResultById`'s return type has no `email` key at all (not `email?:
undefined` — the field doesn't exist in the type or the query), so leaking
it would be a type error, not just a runtime oversight.

**External dependency I can't provision:** this requires a real Supabase
project. You'll need to create one, run the migration above (SQL editor or
`supabase db push`), and put the URL/anon key in `.env.local` before the
persistence parts of Implement can be verified end-to-end. Everything else
(quiz flow, scoring, UI) doesn't depend on this and can be built/tested
first.

**REVISED after real-project verification — migration 0002's direct-UPDATE
policy turned out to be unreliable in practice, replaced by migration
`0003_quiz_results_subscribe_function.sql`:**

Once a real Supabase project was wired up, the Subscribe flow silently never
set `email`, with no error surfaced anywhere. Root cause, found by having the
user run diagnostic SQL (`pg_policy`, `information_schema.column_privileges`)
against their own project: Supabase grants `anon` broad SELECT/UPDATE/INSERT
privileges on *every column* of a new table by default — a platform default,
not something migration 0001/0002 configured. So the column-scoped `grant
update (email) ...` in 0002 was never actually the protection boundary; the
real (and only) protection was "no SELECT policy exists for anon on this
table at all." That has a consequence for the UPDATE side too: confirming a
write succeeded via `.update().select()` requires reading back the row,
which requires a SELECT *policy* — so a direct UPDATE can never reliably
report success without also making `email` broadly readable.

```sql
create or replace function public.subscribe_quiz_result(result_id uuid, new_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.quiz_results
  set email = new_email
  where id = result_id and email is null;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.subscribe_quiz_result(uuid, text) to anon;

drop policy if exists "anon can set email once, only while it is still null" on public.quiz_results;
revoke update (email) on public.quiz_results from anon;
```

This is the standard Supabase pattern for "write plus a confirmation
signal, no row-data exposure": `SECURITY DEFINER` runs the function as its
owner (the table owner), bypassing RLS internally, so it can read-after-write
for its own set-once check without needing any SELECT policy for `anon`. It
returns only a `boolean` — never a row, never `email` itself. The migration
also revokes the now-unnecessary direct `UPDATE (email)` grant from `anon`
and drops the 0002 policy, so all subscribe writes must go through the
vetted function; there is no longer any direct write path to `email` at all.

`src/lib/supabase/actions.ts`'s `subscribeToUpdates` was updated to call
`getSupabaseClient().rpc("subscribe_quiz_result", { result_id, new_email })`
instead of `.from("quiz_results").update(...).eq(...).select(...)`. Its
return contract is unchanged (`{ saved: boolean }`, `false` covers both
"already subscribed" and "unknown id" and any query error) — only the
underlying mechanism moved from a direct table write to an RPC call.
Verified end-to-end against the real project: first call for a fresh id
returns `true` and sets the email; a second call for the same id (or an
unknown id) returns `false` and touches nothing.

## Test strategy
- **`scoring.ts` (unit):** percentage formula (`raw ÷ max × 100`,
  independent per major); tie-inclusive top-3 (covers "tied at cutoff" AC);
  both variants' weight shapes score correctly.
- **`quiz-data-choice.ts` / `quiz-data-scale.ts` (unit):** both export
  exactly the same 7 `topicId`s (enforces "same 7 topics" from the spec).
- **`use-quiz-flow.ts` (unit, `renderHook`):** Prev disabled at index 0;
  Next disabled until answered; answers survive prev→next→prev; last
  question exposes a submit affordance instead of Next.
- **`quiz-flow.tsx` (component, RTL):** one question rendered at a time;
  progress bar fill matches answered-count/7; full `/quiz` and
  `/quiz/scale` walkthroughs reach a results view (covers the two
  "completes all 7 questions" ACs).
- **`submit-panel.tsx` (component, RTL):** base save fires on mount with no
  email involved; Subscribe stays disabled/no-ops until the email is
  validly formatted; clicking Subscribe with a valid email calls
  `subscribeToUpdates` with that email; malformed email blocks Subscribe
  with an inline error and never touches the base save.
- **`saveQuizResult` (unit, Supabase client mocked):** payload shape, no
  `email` field ever sent.
- **`subscribeToUpdates` (unit, Supabase client mocked):** malformed email
  rejected before any query runs (server-side re-validation, not just
  trusting the client); valid email sent as a scoped `.update()` call.
- **`getQuizResultById` (unit, Supabase client mocked):** returned object
  has no `email` property under any circumstance — this is the test that
  actually backs the "email never reaches the browser" AC.
- **`/result/[id]` (component/route test):** known id renders majors/%
  /descriptions/careers; unknown id renders the not-found state.
- **`page.tsx` (component, RTL):** landing page renders links to `/quiz`
  and `/quiz/scale`.
- **Retake (component, RTL):** clicking Retake resets to question 1 with no
  answers retained.

Every acceptance criterion in `specs/quiz/spec.md` maps to at least one test
above; the retry-in-background behavior is tested at the hook/effect level
by mocking `saveQuizResult` to fail N times then succeed and asserting the
results view never shows a blocking/error state.

## Task checklist
> Implement works these top-to-bottom, committing after each.
- [x] `src/lib/majors.ts` + `src/lib/quiz-topics.ts` (content, no logic yet)
- [x] `src/lib/quiz-data-choice.ts` + `src/lib/quiz-data-scale.ts` + test
      asserting matching `topicId`s across variants
- [x] `src/lib/scoring.ts` (`computeResults`, `getTopMajors`) + unit tests.
      **Revised post-implementation, twice:**
      1. Added `normalizeToDisplayPercentage`, applied to `getTopMajors`'s
         output before display/save — reverting from "each major's
         independent raw÷max%" back to "normalize the shown top matches to
         sum to 100%," the original recommendation.
      2. Real bug found via live use: that first version normalized by
         *raw score*, but `getTopMajors` ranks by *independent percentage*
         — different metrics, so a major could rank #1 while showing a
         lower percentage than the major ranked #2 (reported: 38%/44%/19%
         shown, but 38% ranked first). Raw-share also structurally favors
         majors with a bigger max-possible total regardless of true fit.
         Fixed by normalizing the independent percentages themselves, so
         ranking and display always derive from the same metric and can't
         disagree by construction. See spec.md and `normalizeToDisplayPercentage`'s
         doc comment.
- [x] Add `@supabase/supabase-js`; `src/lib/supabase/client.ts`
- [x] `supabase/migrations/0001_quiz_results.sql`; `.env.example`
- [x] `src/lib/supabase/quiz-results.ts` (`saveQuizResult`,
      `getQuizResultById`) + mocked unit tests — implemented as two files
      instead of one: `quiz-results.ts` (plain read, `getQuizResultById`)
      and `actions.ts` (`'use server'`, `saveQuizResult`). A `'use server'`
      file may only export async functions, so keeping the non-action read
      helper in the same file would have accidentally turned it into a
      second public POST-callable action. Same responsibilities as planned,
      split for correctness. Also added `src/lib/quiz-variant.ts`
      (`QuizVariant` type) and `src/lib/email.ts` (`isValidEmail`, shared by
      the server action and the future client-side form) — small extractions
      to avoid duplicating the email regex, not scope additions.
- [x] Add shadcn `checkbox` and `input` primitives via the CLI
- [x] `src/hooks/use-quiz-flow.ts` + unit tests
- [x] `src/components/quiz/progress-bar.tsx`
- [x] `src/components/quiz/choice-question.tsx` +
      `src/components/quiz/scale-question.tsx`
- [x] `src/components/quiz/quiz-flow.tsx` wiring hook + question renderers
      + progress bar + Prev/Next/Submit
- [x] `src/components/quiz/results-list.tsx` (built before `quiz-flow.tsx`
      instead of after, since quiz-flow needs to render it — the plan listed
      them in an order that had quiz-flow depending on a file that didn't
      exist yet; same deliverables, just resequenced)
- [x] `src/components/quiz/submit-panel.tsx` (retake, copy link, background
      base save + retry on mount) + separate Subscribe email field/button
      wired to the new `subscribeToUpdates` action; `src/lib/supabase/actions.ts`
      revised to drop `email` from `saveQuizResult` and add
      `subscribeToUpdates`; migration `0002_quiz_results_email_subscribe.sql`
      added (scoped anon UPDATE). Also fixed a real test-infra gap found
      while writing submit-panel's tests: RTL's auto-cleanup between tests
      was never registered (vitest.config.mts doesn't set `test.globals`),
      so multi-render component test files were leaking DOM across tests —
      added an explicit `afterEach(cleanup)` in vitest.setup.ts.
- [x] `src/app/quiz/page.tsx` + `src/app/quiz/scale/page.tsx` — verified with
      a real `pnpm build`, not just vitest, since this is the first actual
      route wiring in the feature (Server Action boundary, RSC/client
      split)
- [x] `src/app/result/[id]/page.tsx` + `not-found.tsx` — confirmed via
      `node_modules/@base-ui/react/docs/.../button.md` (marked authoritative
      over training data) that Button must never be used for links; styled
      the not-found CTA as a plain `<Link>` with `buttonVariants()` instead.
      Verified `notFound()`'s thrown digest (`NEXT_HTTP_ERROR_FALLBACK;404`)
      directly against this Next version rather than assuming.
- [x] Rewrite `src/app/page.tsx` landing page
- [x] Wire tests for every acceptance criterion (fill any gaps found while
      implementing) — added missing coverage for the save-retry-then-recover
      /save-retry-then-give-up ACs and for answer persistence at the
      component (not just hook) level. A full browser walkthrough (per
      CLAUDE.md/session convention of verifying UI changes live, not just
      via vitest) surfaced two real bugs neither test suite nor `pnpm build`
      caught: `saveQuizResult` and `getQuizResultById` let a thrown error
      from `getSupabaseClient()` (e.g. missing env vars) propagate instead
      of degrading gracefully — the submit panel's "Copy link" got stuck on
      "Preparing link…" forever, and `/result/[id]` hard-crashed the page
      instead of showing the not-found state. Both wrapped in try/catch now,
      with regression tests forcing `getSupabaseClient` to throw and
      asserting `{saved: false}` / `null` rather than a rejection.
- [x] Update `CLAUDE.md`: fix "6 options" → "7 majors"; document required
      env vars and the Supabase migration location
- [x] Fix Subscribe/email persistence against the real Supabase project:
      diagnosed why migration 0002's direct UPDATE policy silently never set
      `email` (Supabase's default broad `anon` column grants, plus RETURNING
      after UPDATE requiring a SELECT policy — see plan revision note above);
      added `supabase/migrations/0003_quiz_results_subscribe_function.sql`
      (`SECURITY DEFINER` function `subscribe_quiz_result`, revokes the
      direct UPDATE grant); switched `subscribeToUpdates` to call `.rpc(...)`
      instead; updated `actions.test.ts`'s mocks to match; verified against
      the real project (fresh id → `true` + email set, repeat/unknown id →
      `false`) and through the live UI (Subscribe button shows "You're
      subscribed").

## Risks & rollout
- **Highest risk: RLS/view misconfiguration leaking `email`.** Mitigated by
  designing the leak out structurally (view has no email column, no anon
  select grant on the base table at all) plus a test on
  `getQuizResultById`'s return shape rather than trusting policy config
  alone.
- **External dependency:** needs a real Supabase project + manually-applied
  migration; I can't provision or run SQL against your live project. Quiz
  flow/scoring/UI work is independent of this and can land first; wire the
  persistence bits once you've created the project and shared the env vars
  (as `.env.local`, never committed).
- **Scoring model risk:** 7 questions across 7 majors can produce flat/close
  results (flagged back when we discussed question count). The weighted
  multi-major model plus tie-inclusive top-3 display is the agreed
  mitigation — no further action unless real usage shows results are too
  flat.
- **No feature flag / rollout gating needed** — this is a new, currently
  unused route (`/`, `/quiz`, `/quiz/scale`, `/result/*`), so it ships when
  merged with no migration-order concerns for existing users.
