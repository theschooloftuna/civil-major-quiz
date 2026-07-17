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
recommendation itself is never blocked or hidden. (Flagging this UX default
now — it's not spelled out in the spec beyond "don't block the UI" — happy
to adjust before Implement if you want different treatment of the pending
state.)

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
- `src/lib/supabase/quiz-results.ts` — new; `'use server'` module with
  `saveQuizResult(input)` (insert) and `getQuizResultById(id)` (reads the
  public view, returns a type with no `email` field at all).

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

The `saveQuizResult` Server Action's return shape:
`{ id: string, saved: boolean }` — `saved: false` means the local result is
still valid, just not (yet) shareable. `getQuizResultById`'s return type has
no `email` key at all (not `email?: undefined` — the field doesn't exist in
the type or the query), so leaking it would be a type error, not just a
runtime oversight.

**External dependency I can't provision:** this requires a real Supabase
project. You'll need to create one, run the migration above (SQL editor or
`supabase db push`), and put the URL/anon key in `.env.local` before the
persistence parts of Implement can be verified end-to-end. Everything else
(quiz flow, scoring, UI) doesn't depend on this and can be built/tested
first.

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
- **`submit-panel.tsx` (component, RTL):** unchecked/empty email → no email
  in the save payload; checked + malformed email → inline error, save
  blocked; checked + valid email → included in payload.
- **`saveQuizResult` (unit, Supabase client mocked):** payload shape;
  email inclusion rule enforced server-side too, not just client-side.
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
- [x] `src/lib/scoring.ts` (`computeResults`, `getTopMajors`) + unit tests
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
- [ ] `src/components/quiz/choice-question.tsx` +
      `src/components/quiz/scale-question.tsx`
- [ ] `src/components/quiz/quiz-flow.tsx` wiring hook + question renderers
      + progress bar + Prev/Next/Submit
- [ ] `src/components/quiz/results-list.tsx`
- [ ] `src/components/quiz/submit-panel.tsx` (email opt-in, retake, copy
      link, background save + retry)
- [ ] `src/app/quiz/page.tsx` + `src/app/quiz/scale/page.tsx`
- [ ] `src/app/result/[id]/page.tsx` + `not-found.tsx`
- [ ] Rewrite `src/app/page.tsx` landing page
- [ ] Wire tests for every acceptance criterion (fill any gaps found while
      implementing)
- [ ] Update `CLAUDE.md`: fix "6 options" → "7 majors"; document required
      env vars and the Supabase migration location

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
