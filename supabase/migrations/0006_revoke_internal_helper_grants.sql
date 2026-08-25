-- Closes a real hole opened by 0005.
--
-- 0005 tried to keep upsert_newsletter_subscriber internal with
--   revoke execute on function ... from public;
-- which is the textbook Postgres answer and is NOT sufficient here. Supabase
-- additionally grants EXECUTE on new public-schema functions to the `anon`
-- and `authenticated` roles *explicitly*. Revoking from PUBLIC does not
-- remove a grant made directly to a role, so the helper stayed callable with
-- nothing but the publishable anon key - letting a caller insert arbitrary
-- addresses and pick its own `source` value.
--
-- Verified against the live database: the anon-key call returned 204 and the
-- row appeared. Hence this migration.

revoke execute on function public.upsert_newsletter_subscriber(text, text)
  from anon, authenticated;

-- The three functions below are meant to be reachable by anon and keep their
-- grants; they are restated here only so this file is a complete statement of
-- who may call what.
grant execute on function public.subscribe_newsletter(text) to anon;
grant execute on function public.unsubscribe_newsletter(uuid) to anon;
grant execute on function public.newsletter_token_exists(uuid) to anon;
grant execute on function public.subscribe_quiz_result(uuid, text) to anon;
