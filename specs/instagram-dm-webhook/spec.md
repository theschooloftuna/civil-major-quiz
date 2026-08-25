# Spec: Instagram comment → auto-DM webhook

## Problem
A working prototype of an Instagram comment-to-DM automation exists on
PythonAnywhere (Flask): when someone comments a trigger word on a reel for
`@the_school_of_tuna`, Meta fires a webhook and the app sends that commenter a
DM via the Private Reply API. It is end-to-end verified but lives on a second
host, separate from this Next.js app, and is therefore a separate deploy, a
separate log stream, and a separate thing to keep alive.

Porting it into this app on Vercel retires the Flask host and puts the
automation next to the landing pages the DM can point at. The source notes for
the port live in `instagram-dm-automation.md` at the repo root, including the
hard-won Meta-side facts that must not be re-derived.

## Goals
- One App Router route handler at `/api/instagram/webhook` that serves both
  Meta's verification handshake (GET) and comment events (POST).
- A real comment containing the trigger word on a reel results in a private
  reply DM to the commenter.
- Domain logic (payload parsing, trigger matching, signature verification)
  lives in `src/lib/instagram/`, framework-agnostic and unit-tested, per the
  project's architecture rules.
- Repeat webhook deliveries for the same comment send at most one DM.
- Misconfiguration degrades to a logged no-op, never a crash and never a
  retry storm.

## Non-goals
- **Long-lived token exchange and auto-refresh.** The access token is read
  from an env var and rotated by hand. Automating this would require moving
  the live token into Supabase (Vercel env vars are immutable at runtime),
  which is a separate feature.
- Any Meta dashboard work — the app is already Live/Published, the account is
  already subscribed to `comments`. Only the callback URL is re-registered,
  and that is a manual deploy-time step, not code.
- Multiple trigger words, per-media rules, or an admin UI. One trigger word,
  one reply text, both from env.
- Replying to comment threads publicly, or handling any webhook field other
  than `comments`.
- Advanced Access / App Review for non-tester accounts.

## Users / scenarios
- **A viewer** comments the trigger word on a reel and receives a DM with the
  link within seconds (in their Requests folder if they don't follow).
- **The account owner** deploys, pastes the new callback URL into Meta, and
  sees the verification handshake go green without touching code.
- **The account owner** comments on their own reel while testing and, by
  default, gets no DM — the self-comment guard is on unless explicitly
  disabled for a test.

## Acceptance criteria
- [ ] Given `GET /api/instagram/webhook?hub.mode=subscribe&hub.verify_token=<correct>&hub.challenge=abc123`, the response is `200` with body exactly `abc123` and content type `text/plain`.
- [ ] Given the same GET with a wrong or missing `hub.verify_token`, the response is `403` and does not echo the challenge.
- [ ] Given a GET whose `hub.mode` is not `subscribe`, the response is `403`.
- [ ] Given `IG_VERIFY_TOKEN` is unset, every GET verification returns `403` rather than throwing.
- [ ] Given a POST whose body contains a `comments` change whose text contains the trigger word (case-insensitively), the app calls `POST https://graph.instagram.com/v25.0/{IG_ACCOUNT_ID}/messages` with body `{"recipient":{"comment_id":<id>},"message":{"text":<IG_REPLY_TEXT>}}` and an `Authorization: Bearer <IG_ACCESS_TOKEN>` header.
- [ ] Given a POST whose comment text does not contain the trigger word, no private reply request is made.
- [ ] Given a POST whose `value.from.id` equals `IG_ACCOUNT_ID`, no private reply is made — unless `IG_ALLOW_SELF_COMMENTS` is `true`, in which case it proceeds.
- [ ] Given two POSTs carrying the same `comment_id` (Meta's retry), exactly one private reply request is made.
- [ ] Given a private reply that fails, the dedupe claim is released so a subsequent Meta retry can attempt it again.
- [ ] Given `IG_APP_SECRET` is set and the `X-Hub-Signature-256` header is absent or does not match an HMAC-SHA256 of the **raw** request body, the response is `403` and no private reply is made.
- [ ] Given `IG_APP_SECRET` is set and the signature matches, the request is processed normally — i.e. reading the raw body for the HMAC does not break JSON parsing.
- [ ] Given `IG_APP_SECRET` is unset, the POST is processed without signature checks and a warning is logged.
- [ ] Every POST that passes the signature gate returns `200` — including malformed JSON, an unknown `field`, an empty `entry` array, and missing required env vars — so Meta does not retry.
- [ ] Every unit of domain logic (`extractCommentEvents`, `matchesTrigger`, signature verification, config reading) has colocated tests, and `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` all pass.

## Edge cases
- Body is not valid JSON, or is valid JSON of a completely unexpected shape
  (`null`, an array, missing `entry`) — parse defensively, return 200.
- A single `entry` carries several `changes`, or several entries arrive at
  once — process each independently; one failure must not abort the others.
- `value.text` missing, empty, or non-string; `value.from` missing entirely.
- A change whose `field` is something other than `comments` (Meta may add
  subscribed fields later) — ignore it.
- Trigger word matching is a case-insensitive substring test, matching the
  proven prototype's behavior. `"COUNTRYSIDE"` therefore matches trigger
  `country`; this is accepted, not a defect.
- The dedupe store is unreachable → fail **open** (send the DM). Meta enforces
  one private reply per comment anyway, so an outage in a bookkeeping table
  must not silence the automation.
- Meta's Test button payload uses fake IDs and the text `"This is an example."`
  — it will not match the trigger and must produce a clean 200, no DM, no error.
- Access token expired (short-lived tokens last ~1h) → the private reply
  returns a non-2xx; log the status and body, release the claim, still 200.

## Constraints & dependencies
- **Instagram API with Instagram Login.** Host `https://graph.instagram.com`,
  version `v25.0`. Not the Facebook Login path.
- **`IG_ACCOUNT_ID` must be the `/me` `id` value (`28392521167038682`)**, not
  the `17841…` `user_id`, which returns error code 100 / subcode 33 on this
  setup.
- One private reply per comment, within 7 days of the comment.
- Meta only delivers real comment webhooks while the app is **Live/Published**.
  The Test button works in Development mode too, so a green Test button is not
  proof of real delivery.
- Secrets live in Vercel Environment Variables, never in the repo. The token
  and app secret exposed during prototyping must be rotated before this is
  considered done.
- Persistence uses the existing Supabase project via the server-only admin
  client, so no new infrastructure dependency is introduced.
- Route handler runs on the Node.js runtime (needs `node:crypto` for the HMAC).

## Open questions
- None. Scope (webhook only, no token refresh), dedupe store (Supabase table),
  and signature posture (enforce when `IG_APP_SECRET` is set, warn when not)
  were decided during the Specify interview.
