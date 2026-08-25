-- Dedupe claims for the Instagram comment -> auto-DM webhook.
--
-- Meta retries webhook deliveries, so the same comment_id can arrive several
-- times. This table is a claim, not a log: the primary key is the dedupe
-- mechanism, and a unique violation on insert is the "already handled"
-- signal. That is atomic across concurrent serverless invocations in a way a
-- read-then-write check is not.
--
-- Only matching comments (ones that actually trigger a DM) are claimed;
-- non-matching comments do nothing on a retry anyway, and keeping them out
-- stops the table growing with every comment on the account.

create table public.ig_processed_comments (
  comment_id text primary key,
  created_at timestamptz not null default now(),
  commenter_id text,
  reply_status integer
);

alter table public.ig_processed_comments enable row level security;

-- No policies at all, deliberately. Nothing public reads or writes this
-- table - only the server-side secret key, which bypasses RLS entirely.
-- Same posture as quiz_results: anon has no grant, so a future policy
-- mistake can't expose it.
