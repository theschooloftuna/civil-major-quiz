# Spec: Newsletter subscription

## Problem
The Instagram auto-DM (shipped in `specs/instagram-dm-webhook/`) tells
commenters "You can join the list here" and links to
`https://civil-major-quiz.vercel.app` — the quiz landing page. There is
nowhere on the site to actually join a list. Someone arriving from that DM
has to complete a 7-question quiz before they encounter an email field at
all, which is a mismatch between what the DM promises and what the page
delivers.

There is also no subscriber list as such. Emails collected today live in the
`email` column of `quiz_results`, one row per quiz completion, with no
concept of subscription status and no way for anyone to opt out. Before the
newsletter's first issue (September 1, 2026) there needs to be a real list
with a real unsubscribe path.

## Goals
- A `/newsletter` page that explains the newsletter and collects an email,
  reachable directly from the Instagram DM link.
- A `newsletter_subscribers` table that is the single source of truth for who
  is on the list and what their status is.
- The existing results-screen email field feeds that table as well as
  `quiz_results`, in one atomic operation.
- Existing quiz-takers who gave an email are backfilled onto the list.
- An `/unsubscribe/<token>` page, linkable from a future email, where one
  click removes someone from the list.

## Non-goals
- **Sending any email.** No provider, no API key, no sending domain, no
  confirmation or welcome mail, no double opt-in. This feature collects
  subscribers; choosing a sender is separate work before the launch date.
- An admin UI for the list. The existing `/analytics` dashboard is not
  extended — it reports on quiz participation and stays that way.
- Importing subscribers from anywhere other than `quiz_results`.
- Editing a subscription (changing address, setting preferences, cadence
  choices). Subscribe and unsubscribe are the only two transitions.
- Bounce handling, suppression of role addresses, or any deliverability
  machinery.

## Users / scenarios
- **A commenter from Instagram** taps the DM link, lands on `/newsletter`,
  reads what Tuna Times actually covers, enters an email, and sees a
  confirmation in place.
- **A quiz-taker** finishes the quiz and enters an email on the results
  screen because they want updates. That address lands in `quiz_results` as
  it does today, *and* on the subscriber list.
- **A subscriber** clicks "unsubscribe" in a future email, lands on
  `/unsubscribe/<token>`, presses one button, and is off the list.
- **Someone who previously unsubscribed** enters their email again — on
  either page — and is put back on the list, because the field is explicitly
  labelled as opting in to updates.

## Acceptance criteria
> These must be testable. Verify checks each one PASS/FAIL.

### Subscribe page
- [ ] `GET /newsletter` renders the Tuna Times masthead ("The School of Tuna presents" / "Tuna Times"), the tagline, the launch date, the reader illustration, the "expect things like" topic list, and the signup form.
- [ ] The topic list renders one row per topic, each paired with an icon.
- [ ] Icons come from `@phosphor-icons/react/ssr`, not the package root — the page is a Server Component and the root import relies on React Context that doesn't exist in RSC.
- [ ] The illustration carries descriptive alt text and is not announced as decorative.
- [ ] The page still carries no quiz cross-link and still makes no cadence promise.
- [ ] Given a valid email is submitted, a row exists in `newsletter_subscribers` with that address, `status = 'subscribed'`, and `source = 'newsletter_page'`.
- [ ] Given a syntactically invalid email, the form shows an inline error, no request is made, and no row is written.
- [ ] Email validity is re-checked server-side, so a request that bypasses the form is rejected the same way.
- [ ] Given an address already on the list as `subscribed`, submitting it again writes no duplicate row and leaves `subscribed_at` unchanged.
- [ ] The page reports the same generic success for a new address and an already-subscribed one, so it cannot be used to test whether an address is on the list.
- [ ] Addresses are normalized (trimmed, lowercased) before storage and comparison, so `Foo@Example.com ` and `foo@example.com` are one subscriber, not two.

### Quiz results-screen integration
- [ ] Given an email entered on the results screen, it is written to `quiz_results.email` exactly as it is today — the existing behavior does not regress.
- [ ] The same submission also creates a `newsletter_subscribers` row with `source = 'quiz'` when that address is not already on the list.
- [ ] Both writes happen in one atomic database operation: if the subscriber write fails, the `quiz_results.email` write does not persist either.
- [ ] Given the address is on the list with `status = 'unsubscribed'`, the submission flips it to `subscribed` and sets a fresh `subscribed_at`.
- [ ] Given the address is on the list and already `subscribed`, the submission changes no subscriber row.
- [ ] The results screen's success and error states are unchanged from today's behavior.

### Unsubscribe page
- [ ] Every subscriber row has an `unsubscribe_token` that is unique and unguessable (a random UUID, not derived from the email).
- [ ] `GET /unsubscribe/<valid-token>` renders a confirmation button; it does not unsubscribe on page load, so an email client prefetching the link cannot unsubscribe anyone.
- [ ] Pressing the button sets `status = 'unsubscribed'` and stamps `unsubscribed_at` for exactly that subscriber.
- [ ] `GET /unsubscribe/<unknown-token>` renders a "this link isn't valid" state and writes nothing.
- [ ] Pressing the button for an already-unsubscribed token reports success without error and does not change `unsubscribed_at` again.
- [ ] No page in the unsubscribe flow ever displays or returns the subscriber's email address, so possessing a token reveals only that the token is valid.

### Data & security
- [ ] `anon` has no direct `select`, `insert`, `update`, or `delete` grant on `newsletter_subscribers`; every write goes through a `SECURITY DEFINER` function that returns only a boolean, matching the `subscribe_quiz_result` pattern in migration 0003.
- [ ] A migration backfills every distinct non-null email in `quiz_results` into `newsletter_subscribers` with `status = 'subscribed'` and `source = 'quiz'`.
- [ ] The backfill is idempotent — running it twice produces no duplicates and no errors.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` all pass.

## Edge cases
- Two people submit the same address simultaneously — the unique constraint
  on the normalized address settles it; neither request errors.
- An address that appears on many `quiz_results` rows backfills to exactly
  one subscriber row.
- Whitespace-padded, mixed-case, and unicode addresses normalize consistently.
- A token in the URL that is well-formed but unknown, and one that is not a
  UUID at all — both render the invalid state rather than throwing.
- Supabase env vars missing or the database unreachable — both pages degrade
  to an error message, never an unhandled render crash, matching the
  `getQuizResultById` precedent.
- **Deliberate decision:** re-entering an address after unsubscribing puts
  the person back on the list. The results-screen field is explicitly worded
  as an opt-in for updates, so re-entering it is a fresh, affirmative signal
  rather than an accident. `subscribed_at` / `unsubscribed_at` retain the
  history if this ever needs auditing.

## Constraints & dependencies
- Supabase Postgres, reached through the anon key. RLS is the enforcement
  boundary; the app-layer checks are convenience, not security.
- Follows migration 0003's established pattern: no `select` policy for
  `anon`, all writes via `SECURITY DEFINER` functions returning a boolean and
  never row data — because returning a written row is itself a read and would
  require a policy that exposes the email column.
- Server Components by default; only the two forms are Client Components.
- Styling comes from `src/components/theme-custom/`, never `src/components/ui/`
  directly, per the project's golden rule.
- The `IG_REPLY_TEXT` env var must be repointed to `/newsletter` once this
  ships — a Vercel env change, not a code change.
- Existing `subscribe_quiz_result` callers must keep working; the function's
  signature and boolean return contract do not change.

## Open questions
- None. Route (`/newsletter`), unsubscribe mechanism (opaque token plus a
  confirmation button), scope (capture only, no sending), backfill (yes), and
  re-subscribe behavior were all settled during the Specify interview.
