-- Assertions for migration 0005. Run in the Supabase SQL editor after
-- applying the migration.
--
-- These cover the spec's database-level acceptance criteria, which the Vitest
-- suite structurally cannot reach (grants, atomicity, constraints, backfill).
-- PART A is read-only. PART B mutates inside a transaction and rolls back.

-- ===================== PART A - static, read-only =====================

select check_name, expected, actual, (expected = actual) as pass from (
  select 'rls enabled' as check_name, true as expected,
         (select relrowsecurity from pg_class
           where oid = 'public.newsletter_subscribers'::regclass) as actual
  union all
  select 'zero policies on the table', 0,
         (select count(*)::int from pg_policies
           where schemaname = 'public' and tablename = 'newsletter_subscribers')
  union all
  select 'anon has no direct table privileges', 0,
         (select count(*)::int from information_schema.role_table_grants
           where grantee = 'anon' and table_name = 'newsletter_subscribers')
  union all
  select 'helper NOT executable by anon', false,
         has_function_privilege('anon',
           'public.upsert_newsletter_subscriber(text,text)', 'execute')
  union all
  select 'subscribe_newsletter executable by anon', true,
         has_function_privilege('anon',
           'public.subscribe_newsletter(text)', 'execute')
  union all
  select 'unsubscribe_newsletter executable by anon', true,
         has_function_privilege('anon',
           'public.unsubscribe_newsletter(uuid)', 'execute')
  union all
  select 'newsletter_token_exists executable by anon', true,
         has_function_privilege('anon',
           'public.newsletter_token_exists(uuid)', 'execute')
  -- The three attributes a careless `create or replace` silently drops.
  union all
  select 'subscribe_quiz_result still SECURITY DEFINER', true,
         (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'subscribe_quiz_result')
  union all
  select 'subscribe_quiz_result still pins search_path', true,
         (select proconfig @> array['search_path=public'] from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'subscribe_quiz_result')
  union all
  select 'subscribe_quiz_result still executable by anon', true,
         has_function_privilege('anon',
           'public.subscribe_quiz_result(uuid,text)', 'execute')
  -- Backfill landed, and every stored address obeys the normalization rule.
  union all
  select 'backfill covers every distinct quiz email', true,
         (select count(*) = 0 from (
            select distinct lower(btrim(email)) as e from public.quiz_results
             where email is not null and btrim(email) <> ''
            except
            select email from public.newsletter_subscribers) missing)
  union all
  select 'all stored emails are normalized', 0,
         (select count(*)::int from public.newsletter_subscribers
           where email <> lower(btrim(email)))
) checks order by pass, check_name;


-- ===================== PART B - behavioral, rolled back =====================
-- Run this block separately. It writes, asserts, then undoes everything.

begin;

do $$
declare
  tok uuid;
  first_subscribed_at timestamptz;
  quiz_id uuid;
  ok boolean;
begin
  -- normalization + insert
  perform public.subscribe_newsletter('  MixedCase@Example.COM ');
  assert (select count(*) = 1 from public.newsletter_subscribers
           where email = 'mixedcase@example.com'),
         'expected one normalized row';

  select unsubscribe_token, subscribed_at into tok, first_subscribed_at
    from public.newsletter_subscribers where email = 'mixedcase@example.com';

  -- re-subscribing while already subscribed is a no-op
  perform pg_sleep(0.01);
  perform public.subscribe_newsletter('mixedcase@example.com');
  assert (select count(*) = 1 from public.newsletter_subscribers
           where email = 'mixedcase@example.com'),
         'duplicate row created';
  assert (select subscribed_at = first_subscribed_at
            from public.newsletter_subscribers where email = 'mixedcase@example.com'),
         'subscribed_at was bumped for an already-subscribed address';

  -- unsubscribe, then confirm a second unsubscribe is idempotent
  assert public.unsubscribe_newsletter(tok), 'unsubscribe returned false';
  assert (select status = 'unsubscribed' from public.newsletter_subscribers
           where unsubscribe_token = tok), 'status did not flip';
  assert public.unsubscribe_newsletter(tok), 'second unsubscribe returned false';

  -- unknown token
  assert not public.unsubscribe_newsletter(gen_random_uuid()),
         'unknown token should return false';
  assert not public.newsletter_token_exists(gen_random_uuid()),
         'unknown token should not exist';
  assert public.newsletter_token_exists(tok), 'valid token should exist';

  -- re-subscribing after unsubscribing reactivates
  perform public.subscribe_newsletter('mixedcase@example.com');
  assert (select status = 'subscribed' and unsubscribed_at is null
            from public.newsletter_subscribers where unsubscribe_token = tok),
         'reactivation did not clear the unsubscribe';

  -- quiz path writes both places, atomically
  quiz_id := gen_random_uuid();
  insert into public.quiz_results (id, variant, answers, scores, top_majors)
  values (quiz_id, 'choice', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb);

  ok := public.subscribe_quiz_result(quiz_id, 'QuizPerson@Example.com');
  assert ok, 'subscribe_quiz_result returned false';
  assert (select email = 'QuizPerson@Example.com' from public.quiz_results
           where id = quiz_id), 'quiz_results.email not written verbatim';
  assert (select source = 'quiz' from public.newsletter_subscribers
           where email = 'quizperson@example.com'),
         'subscriber row not created from the quiz path';

  -- set-once guard still holds, and does not touch the list a second time
  assert not public.subscribe_quiz_result(quiz_id, 'someoneelse@example.com'),
         'set-once guard no longer blocks a second write';
  assert (select count(*) = 0 from public.newsletter_subscribers
           where email = 'someoneelse@example.com'),
         'blocked quiz write still reached the subscriber list';

  raise notice 'PART B: all behavioral assertions passed';
end $$;

rollback;
