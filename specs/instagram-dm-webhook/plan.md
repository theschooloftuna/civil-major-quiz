# Plan: Instagram comment → auto-DM webhook

## Spec
Link: `specs/instagram-dm-webhook/spec.md`
Source notes: `instagram-dm-automation.md` (repo root)

## Codebase findings
- **No API routes exist yet.** Every server interaction today is a Server
  Action (`src/lib/supabase/actions.ts`, `src/lib/analytics/actions.ts`).
  This is the first `route.ts` in the app, so it sets the pattern.
- **Two Supabase clients already exist**: `src/lib/supabase/client.ts` (anon,
  RLS-enforced, public paths) and `src/lib/supabase/admin-client.ts` (secret
  key, bypasses RLS, server-only, lazily memoized and throws on missing env).
  The dedupe table is internal bookkeeping with no public read path, so it
  uses the admin client and gets no RLS policies at all — the same "no grant
  for anon" posture as `quiz_results`.
- **HMAC precedent**: `src/lib/analytics/session.ts` signs with
  `createHmac("sha256", …)` and compares with `timingSafeEqual` behind an
  explicit length guard. The webhook signature check mirrors it exactly.
- **Env-var precedent**: `src/lib/analytics/auth.ts` `.trim()`s env values
  because hosting-platform env UIs don't strip pasted newlines/quotes — a bug
  that only ever shows in production. Every Instagram env read does the same.
- **Degrade-don't-crash precedent**: `getQuizResultById` swallows the
  missing-env throw and returns null; `/analytics` renders a `ConfigError`
  state. The webhook applies the same rule, returning 200 on misconfiguration.
- **Next 16 route handlers** (`node_modules/next/dist/docs/…/route.md`) are
  not cached by default and Cache Components is not enabled in
  `next.config.ts`, so no `dynamic` export is needed. `after()` from
  `next/server` is available for post-response work.
- **Vitest** runs `jsdom` globally with a `server-only` mock in
  `vitest.setup.ts`. Node-only test files opt out per-file with a
  `// @vitest-environment node` docblock.

## Approach
One route handler, thin. It does transport only: read the raw body, gate on
the signature, parse, hand off. All decisions live in `src/lib/instagram/`
as small pure functions that are trivial to unit-test without a server.

The POST handler returns `200` immediately and does the network work inside
`after()`, which is Next 16's supported way to run post-response work in a
route handler. This satisfies Meta's "ack fast or we retry" contract without
the fire-and-forget floating promise that would otherwise get killed when the
serverless invocation freezes.

Signature verification reads `await request.text()` **first** and computes the
HMAC over that exact string, then `JSON.parse`s it — the raw-body gotcha
called out in the source notes. `request.json()` is never used.

Dedupe is a claim, not a log: insert the `comment_id` as a primary key and let
Postgres' unique violation be the "already handled" signal, which is atomic
across concurrent serverless instances in a way a read-then-write is not. A
failed send releases the claim so Meta's retry can succeed.

Alternatives rejected: Vercel KV (new dependency and dashboard setup for one
key-existence check, when Supabase is already wired); in-memory dedupe (does
not survive cold starts or multiple instances).

## Files to add / change
- `supabase/migrations/0004_ig_processed_comments.sql` — new; the dedupe
  claim table, RLS on with no policies.
- `src/lib/instagram/config.ts` — new; trimmed env reads, `getVerifyToken()`
  and `getInstagramConfig()` returning either a config or the list of missing
  var names for logging.
- `src/lib/instagram/signature.ts` — new; `verifyWebhookSignature(rawBody,
  header, appSecret)`, constant-time.
- `src/lib/instagram/payload.ts` — new; `extractCommentEvents(body)` defensive
  parser and `matchesTrigger(text, word)`.
- `src/lib/instagram/private-reply.ts` — new; `sendPrivateReply()`, the only
  place that knows the Graph URL shape.
- `src/lib/instagram/dedupe.ts` — new; `claimComment()` / `releaseComment()` /
  `recordReplyStatus()` over the admin client, failing open.
- `src/lib/instagram/process.ts` — new; `processCommentEvents()`, the
  orchestration the route defers into `after()`.
- `src/app/api/instagram/webhook/route.ts` — new; GET handshake + POST intake.
- Colocated `*.test.ts` for config, signature, payload, private-reply,
  process, and the route.
- `.env.example` — document the six `IG_*` vars.
- `CLAUDE.md` — add the Instagram vars to the Environment variables section.

## Contract / data changes
- New public route `GET|POST /api/instagram/webhook`.
- New table `public.ig_processed_comments (comment_id text primary key,
  created_at timestamptz, commenter_id text, reply_status integer)`. RLS
  enabled, zero policies — reachable only via the secret key.
- New env vars: `IG_ACCESS_TOKEN`, `IG_APP_SECRET` (optional),
  `IG_ACCOUNT_ID`, `IG_VERIFY_TOKEN`, `IG_TRIGGER_WORD`, `IG_REPLY_TEXT`,
  `IG_ALLOW_SELF_COMMENTS` (optional, testing escape hatch).

## Test strategy
- **Unit — `signature.ts`**: valid signature, tampered body, tampered
  signature, missing header, wrong-length hex, missing `sha256=` prefix.
- **Unit — `payload.ts`**: the confirmed-good real payload from the source
  notes; multiple entries and multiple changes; non-`comments` field; missing
  `text`/`from`; `null`/array/garbage bodies; trigger matching case
  insensitivity and non-match.
- **Unit — `config.ts`**: all present, each required var missing (reported by
  name), whitespace trimming, `IG_ALLOW_SELF_COMMENTS` parsing.
- **Unit — `private-reply.ts`**: asserts URL, method, headers, and JSON body
  against a stubbed `fetch`; non-2xx surfaces status and body; a thrown
  network error resolves rather than rejects.
- **Unit — `process.ts`** with `fetch` and the dedupe module stubbed:
  trigger match sends, non-match does not, self-comment skipped, self-comment
  allowed under the flag, duplicate claim skips, failed send releases the
  claim, one event failing does not abort its siblings.
- **Route — `route.test.ts`** (`@vitest-environment node`, `after` mocked to
  run inline): the four GET criteria; POST 403 on bad/missing signature when
  the secret is set; POST 200 on good signature; POST 200 on malformed JSON;
  POST 200 with missing config.
- Every acceptance-criteria checkbox maps to at least one of the above; the
  final build/lint/typecheck criterion is the Verify phase's gate.

## Task checklist
- [ ] Migration for `ig_processed_comments`
- [ ] `config.ts` + tests
- [ ] `signature.ts` + tests
- [ ] `payload.ts` + tests
- [ ] `private-reply.ts` + tests
- [ ] `dedupe.ts`
- [ ] `process.ts` + tests
- [ ] `route.ts` + tests
- [ ] `.env.example` and `CLAUDE.md` documentation
- [ ] Full `pnpm test && pnpm lint && pnpm typecheck && pnpm build`

## Risks & rollout
- **Risk: real comments stay silent after deploy.** Almost always the Meta app
  dropping out of Live mode, or the callback URL not re-verified — not code.
  The source notes' testing checklist is the triage order. Mitigation: log
  every inbound POST's event count so "did it arrive" is answerable from
  Vercel logs alone.
- **Risk: an unsigned public endpoint that sends DMs.** Mitigated by setting
  `IG_APP_SECRET` in production; the warning log makes the unprotected state
  visible rather than silent.
- **Risk: token expiry silently kills the bot** (short-lived tokens last ~1h).
  Out of scope here by decision; the non-2xx status is logged so the failure
  is diagnosable, and the long-lived exchange remains a documented manual step.
- **Risk: secrets already exposed during prototyping.** The token and app
  secret must be rotated before this is considered live.
- **Backout:** delete the callback URL in Meta, or unset `IG_ACCESS_TOKEN` —
  the route then no-ops with a logged missing-config warning. No migration
  rollback needed; the table is additive and touched by nothing else.
