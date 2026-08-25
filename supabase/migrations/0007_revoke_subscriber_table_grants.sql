-- Removes the default table privileges Supabase grants to anon on any new
-- public-schema table (all 7: select, insert, update, delete, truncate,
-- references, trigger).
--
-- Not currently exploitable: RLS is on with zero policies, so every row
-- access by anon is denied regardless of the grant. But 0005's comment
-- claimed anon "has no grant on it at all", which was not true - the grant
-- was there, and only RLS stood in the way. This makes the comment true, so
-- that a future policy added for some unrelated reason cannot quietly turn
-- the existing grant into read access on the email column.
--
-- Safe for the functions: they are SECURITY DEFINER and execute as their
-- owner, so anon's privileges on this table are irrelevant to them.
--
-- Note: public.quiz_results carries the same default grants (see 0003's
-- header, which documents this as a platform default). It is left alone
-- here - narrowing it is a separate change with its own blast radius.

revoke all on table public.newsletter_subscribers from anon, authenticated;
