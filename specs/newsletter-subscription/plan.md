# Plan: Newsletter subscription

## Spec
Link: `specs/newsletter-subscription/spec.md`

## Codebase findings
> From the Explore pass plus a read of the live database.

- **The results screen already contains a working email-subscribe form.**
  `src/components/quiz/submit-panel.tsx` is the closest template for both new
  forms: three `useState` values (`email`, `emailError`, and a string-union
  status machine `"idle" | "sending" | "subscribed" | "error"`), client
  validation via the shared `isValidEmail`, and a success state that replaces
  the form subtree with `<Alert variant="success">`. There is no
  `useActionState`/`useFormStatus` anywhere in the repo.
- **Server actions never throw.** They return `{ saved: boolean }` and swallow
  exceptions (`src/lib/supabase/actions.ts:43-48,79-81`); the client only
  branches on the boolean. New actions must keep that contract.
- **No shared page shell.** `src/app/layout.tsx` is the only layout — fonts,
  `globals.css`, `<Toaster />`. Every page builds its own
  `mx-auto flex w-full max-w-* flex-col gap-* px-4 py-*` container. The narrow
  single-form precedent is `src/components/analytics/login-form.tsx:32`
  (`max-w-sm ... py-24`).
- **Dynamic params are a Promise**, declared as a local interface and awaited
  in the body (`src/app/result/[id]/page.tsx:11-16`). Missing records call
  `notFound()` with a colocated `not-found.tsx` boundary.
- **`theme-custom/` has everything needed**: `Button` (`variant`
  default/primary/secondary/ghost, `size` lg), `Input`, `Field`/`FieldLabel`/
  `FieldError`, `Alert`/`AlertDescription` (`variant` notice/success/
  destructive). Note only three of the `Field` primitives are re-exported.
- **Preferred labeling is `<FieldLabel htmlFor>` + `<Input id>`**
  (`login-form.tsx:36-38`). `submit-panel.tsx` has its label commented out and
  leans on `aria-label` — the new pages should follow login-form, not that.
- **Test idiom is fixed**: `vi.mock(...)` forwarding to hoist-safe `vi.fn()`
  consts, then `const { X } = await import("./x")`. Async Server Component
  pages are *called as functions* and their JSX passed to `render`, with
  params supplied as `Promise.resolve({...})`. `notFound()` is asserted via
  `rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })`.
- **Live data**: 236 `quiz_results` rows, 53 with an email. All 53 are already
  distinct, lowercase, and unpadded — so the backfill inserts exactly 53 rows
  and normalization collapses nothing. No data-cleanup surprise hiding in it.
- **Migration 0003 is the security precedent** and its comment explains why:
  Supabase grants `anon` broad column privileges by default, so the only real
  protection for `email` is that `anon` has no SELECT *policy* — which also
  means a plain `.update().select()` can never confirm success. Hence
  `SECURITY DEFINER` functions returning a bare boolean.

## Approach
All state transitions live in Postgres functions; the app layer only calls
them and renders the boolean. This is not a stylistic choice — it is what
migration 0003 already established, and the same reasoning applies verbatim to
a table with an `email` column.

The atomicity requirement falls out for free. Rather than have the app write
`quiz_results.email` and then write a subscriber row (two round trips, two
failure modes), `subscribe_quiz_result` is replaced in place to do both. One
function body is one transaction, so a failed subscriber write rolls back the
email write. **The function's signature and boolean contract do not change, so
`src/lib/supabase/actions.ts` and `submit-panel.tsx` need no edits at all** —
the existing quiz path gains the new behavior without touching app code.

An internal `upsert_newsletter_subscriber(email, source)` helper holds the
insert-or-reactivate logic, so the newsletter page and the quiz path cannot
drift apart. It must carry an explicit
`revoke execute on function ... from public` — Postgres grants `EXECUTE` to
`PUBLIC` on every new function, and `anon` is in `PUBLIC`, so *omitting* a
grant is not the same as withholding one. Without the revoke a client could
call the helper directly and choose its own `source` value.

Email normalization (`lower(btrim(...))`) happens inside the functions rather
than in TypeScript, so it cannot be bypassed by calling the RPC directly, and
a check constraint enforces the invariant on the column itself.

Rejected alternatives: a `citext` column (extension dependency for something a
normalizing function already handles); app-layer dual writes (not atomic); a
`select` policy for `anon` so the client could read subscriber state (would
expose the email column, exactly the mistake 0002 made).

## Files to add / change
**Database**
- `supabase/migrations/0005_newsletter_subscribers.sql` — new. Table, RLS-on
  with zero policies, the four functions, grants, and the backfill.

**Server**
- `src/lib/newsletter/actions.ts` — new. `subscribeToNewsletter(email)` and
  `unsubscribeByToken(token)` Server Actions, mirroring the
  never-throw/return-boolean contract.
- `src/lib/supabase/newsletter.ts` — new, `server-only`. `newsletterTokenExists(token)`
  read path, mirroring `quiz-results.ts` including its swallow-and-return-null
  behavior when env vars are missing.

**Pages / components**
- `src/app/newsletter/page.tsx` — new. Server Component: metadata, heading,
  one paragraph, renders the client form.
- `src/components/newsletter/newsletter-signup.tsx` — new, `"use client"`.
- `src/app/unsubscribe/[token]/page.tsx` — new. Awaits params, validates the
  token, `notFound()` when unknown.
- `src/app/unsubscribe/[token]/not-found.tsx` — new. "This unsubscribe link
  isn't valid" boundary, modelled on `result/[id]/not-found.tsx`.
- `src/components/newsletter/unsubscribe-button.tsx` — new, `"use client"`.

**Unchanged on purpose**: `submit-panel.tsx`, `src/lib/supabase/actions.ts`,
`/analytics`.

**Docs**
- `CLAUDE.md` — note the new table in the env/architecture sections.

## Contract / data changes
```
public.newsletter_subscribers
  id                 uuid pk default gen_random_uuid()
  email              text not null unique   -- check (email = lower(btrim(email)))
  status             text not null default 'subscribed'
                       check (status in ('subscribed','unsubscribed'))
  unsubscribe_token  uuid not null unique default gen_random_uuid()
  source             text not null check (source in ('newsletter_page','quiz'))
  created_at         timestamptz not null default now()
  subscribed_at      timestamptz not null default now()
  unsubscribed_at    timestamptz
```
RLS enabled, **no policies** — `anon` reaches it only through:

| Function | Grant | Returns |
|---|---|---|
| `upsert_newsletter_subscriber(text, text)` | **revoked from public** | void |
| `subscribe_newsletter(text)` | anon | boolean |
| `unsubscribe_newsletter(uuid)` | anon | boolean |
| `newsletter_token_exists(uuid)` | anon | boolean |
| `subscribe_quiz_result(uuid, text)` | anon (**existing**, replaced) | boolean — unchanged |

Re-subscribe semantics live in the upsert: `on conflict (email) do update set
status='subscribed', subscribed_at=now(), unsubscribed_at=null` guarded by
`where status='unsubscribed'`, so an already-subscribed address is a silent
no-op that still reports success (no enumeration).

`unsubscribe_newsletter` returns `false` only for an unknown token; an
already-unsubscribed token returns `true` without re-stamping
`unsubscribed_at`.

## Test strategy
**Unit / component (Vitest)** — maps the app-observable criteria:
- `newsletter-signup.test.tsx`: renders heading/paragraph/input/button and
  nothing else; invalid email shows inline error and calls no action; valid
  email calls the action; success swaps in the `Alert`; action failure shows an
  error; button disabled and relabelled while sending.
- `unsubscribe-button.test.tsx`: click calls the action with the token;
  success and failure states; disabled while pending.
- `app/newsletter/page.test.tsx`: renders, has the right metadata title.
- `app/unsubscribe/[token]/page.test.tsx`: valid token renders the button;
  unknown token rejects with the `NEXT_HTTP_ERROR_FALLBACK;404` digest.
- `lib/newsletter/actions.test.ts`: server-side email revalidation rejects a
  bad address without calling the RPC; RPC error and thrown exception both
  return `{ saved: false }`.
- `lib/supabase/newsletter.test.ts`: missing env vars degrade to `false`.

**Database (manual SQL, not Vitest)** — being explicit, because this is a real
gap: the repo has no DB test harness, so the criteria about atomicity,
grants, the unique constraint, and backfill idempotency **cannot** be covered
by `pnpm test`. They will be verified by running a scripted set of SQL
assertions against the Supabase project during Verify, and the script will be
committed at `supabase/checks/0005_newsletter_subscribers.sql` so it is
repeatable rather than a one-off console session. Criteria covered this way:
atomic dual write, no `anon` grants, normalization/uniqueness, re-subscribe
transitions, token uniqueness, backfill count (expect exactly 53) and
idempotency on a second run.

## Task checklist
- [x] Migration 0005: table + constraints + RLS, no policies
- [x] Migration 0005: `upsert_newsletter_subscriber` + the three anon-granted functions
- [x] Migration 0005: replace `subscribe_quiz_result` to dual-write
- [x] Migration 0005: backfill from `quiz_results`, idempotent
- [x] `supabase/checks/0005_newsletter_subscribers.sql` assertion script
- [x] `src/lib/supabase/newsletter.ts` + test
- [x] `src/lib/newsletter/actions.ts` + test
- [x] `src/components/newsletter/newsletter-signup.tsx` + test
- [x] `src/app/newsletter/page.tsx` + test
- [x] `src/components/newsletter/unsubscribe-button.tsx` + test
- [x] `src/app/unsubscribe/[token]/page.tsx` + `not-found.tsx` + tests
- [x] `CLAUDE.md` update
- [x] Full `pnpm test && pnpm lint && pnpm typecheck && pnpm build`

## Risks & rollout
- **Replacing `subscribe_quiz_result` is the one genuinely risky step** — it is
  live and working, with 53 emails already collected through it. Three
  specific hazards: (a) `create or replace` restates the whole definition, so
  omitting `security definer` or `set search_path = public` silently changes
  behavior for `anon` while still working for the owner in the SQL editor;
  (b) it must be `create or replace`, never `drop` + `create`, because a drop
  loses the existing `grant execute ... to anon`; (c) the helper must be
  created before the function that calls it. Recovery is re-running 0003's
  body verbatim. Mitigation: apply and verify 0005 on the database *before*
  merging any app code — the app change is purely additive, and the function
  swap is the only thing that can regress the existing quiz.
- **`EXECUTE` defaults to `PUBLIC`.** Any function added here that is not meant
  for `anon` needs an explicit revoke, not merely the absence of a grant.
  The check script asserts this rather than trusting it.
- **DB-level criteria are not covered by CI.** Stated plainly above. If the
  assertion script isn't run, those criteria are unverified — not verified-by-
  assumption.
- **Migration order matters**: the backfill must run after the table exists and
  after the constraint is in place, all inside 0005, so a partial apply cannot
  leave the list half-populated.
- **`IG_REPLY_TEXT` still points at the site root.** Shipping this does nothing
  for the DM funnel until that env var is repointed at `/newsletter` and the
  project redeployed. That is a deploy step, not a code change, and it is
  easy to forget.
- **No email is ever sent**, so an unsubscribe link only becomes reachable once
  a sender exists. The token and page are built now so the sender integration
  has something to link to later.
- **Backout**: drop the two routes and the table; restore `subscribe_quiz_result`
  from 0003. `quiz_results` is never structurally altered, so the quiz is
  unaffected either way.

## Open questions
- None blocking. One flagged deviation: DB-level acceptance criteria are
  verified by a committed SQL script rather than by `pnpm test`, because no
  database test harness exists in this repo. Say so if you'd rather I build
  one instead.
