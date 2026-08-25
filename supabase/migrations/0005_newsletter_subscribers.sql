-- Newsletter subscriber list.
--
-- Security posture is inherited wholesale from 0003: `anon` gets no policies
-- and no direct grants on this table, and every write goes through a
-- SECURITY DEFINER function that returns only a boolean. The reasoning in
-- 0003's header applies verbatim here - this table has an `email` column, so
-- adding a SELECT policy to let a write confirm itself would expose exactly
-- what must stay hidden.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),

  -- Stored already-normalized. The check makes that an invariant of the
  -- column rather than a promise the application makes, so a raw REST call
  -- or a future code path can't introduce a case-variant duplicate.
  email text not null unique
    check (email = lower(btrim(email)) and email <> ''),

  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed')),

  -- Random, not derived from the email: possessing a token proves only that
  -- the token is valid, never whose it is.
  unsubscribe_token uuid not null unique default gen_random_uuid(),

  source text not null check (source in ('newsletter_page', 'quiz')),

  created_at timestamptz not null default now(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

-- No policies, deliberately - see the header. `anon` reaches this table only
-- through the functions below.


-- Insert-or-reactivate. Both entry points (the newsletter page and the quiz
-- results screen) funnel through here so their semantics cannot drift apart.
--
-- The `where` on the conflict branch is what makes a re-submission from an
-- already-subscribed address a genuine no-op: it leaves subscribed_at alone
-- instead of bumping it, while still not erroring.
create or replace function public.upsert_newsletter_subscriber(
  new_email text,
  new_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(btrim(new_email));
begin
  if normalized = '' then
    raise exception 'email must not be empty';
  end if;

  insert into public.newsletter_subscribers (email, source)
  values (normalized, new_source)
  on conflict (email) do update
    set status = 'subscribed',
        subscribed_at = now(),
        unsubscribed_at = null
    where newsletter_subscribers.status = 'unsubscribed';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function, and `anon` is in
-- PUBLIC - so omitting a grant is NOT the same as withholding one. Without
-- this revoke a client could call the helper directly and pick its own
-- `source` value.
revoke execute on function public.upsert_newsletter_subscriber(text, text) from public;


-- Public entry point for the /newsletter page.
--
-- Always returns true for a well-formed address, whether it was new or
-- already on the list. Reporting "already subscribed" would turn the form
-- into a way to test whether a given address is a subscriber.
create or replace function public.subscribe_newsletter(new_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_newsletter_subscriber(new_email, 'newsletter_page');
  return true;
end;
$$;

revoke execute on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon;


-- Returns false only for a token that does not exist. An already-unsubscribed
-- token returns true without re-stamping unsubscribed_at, so a second click
-- (or an email client re-fetching the link) is harmless.
create or replace function public.unsubscribe_newsletter(token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.newsletter_subscribers where unsubscribe_token = token
  ) then
    return false;
  end if;

  update public.newsletter_subscribers
     set status = 'unsubscribed',
         unsubscribed_at = now()
   where unsubscribe_token = token
     and status = 'subscribed';

  return true;
end;
$$;

revoke execute on function public.unsubscribe_newsletter(uuid) from public;
grant execute on function public.unsubscribe_newsletter(uuid) to anon;


-- Lets the unsubscribe page decide between "show the button" and "this link
-- isn't valid" without ever returning the row. Leaks only token validity,
-- which the holder of the token already knows.
create or replace function public.newsletter_token_exists(token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.newsletter_subscribers where unsubscribe_token = token
  );
end;
$$;

revoke execute on function public.newsletter_token_exists(uuid) from public;
grant execute on function public.newsletter_token_exists(uuid) to anon;


-- Replaces the function introduced in 0003 so the results-screen email lands
-- on the subscriber list as well as in quiz_results.
--
-- Signature, return type, and boolean contract are unchanged, so the existing
-- app code calling this needs no edit. One function body is one transaction,
-- which is what makes the two writes atomic: if the subscriber write raises,
-- the quiz_results update rolls back with it and the caller sees `false`.
--
-- MUST stay `create or replace` rather than drop+create: replacing preserves
-- the function's existing grant to `anon`, dropping would discard it. The
-- `security definer` and `set search_path` clauses must be restated here too
-- - a replace rewrites the whole definition, and losing `security definer`
-- would break every anon caller while still working for the table owner.
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

  -- Set-once guard, unchanged from 0003. A repeat submission touches nothing
  -- here, so it must not touch the subscriber list either.
  if updated_count = 0 then
    return false;
  end if;

  perform public.upsert_newsletter_subscriber(new_email, 'quiz');
  return true;
end;
$$;

-- Redundant while the replace above preserves it, but makes the intended
-- grant explicit and survives a future drop+recreate by someone in a hurry.
grant execute on function public.subscribe_quiz_result(uuid, text) to anon;


-- Backfill: everyone who already gave an email on the results screen opted
-- into updates, so they start on the list. `on conflict do nothing` makes
-- this safe to re-run.
insert into public.newsletter_subscribers (email, source)
select distinct lower(btrim(email)), 'quiz'
from public.quiz_results
where email is not null and btrim(email) <> ''
on conflict (email) do nothing;
