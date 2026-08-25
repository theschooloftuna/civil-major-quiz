-- Who can call what, across every function in the public schema.
--
-- Run after any migration that adds a function. Supabase grants EXECUTE to
-- anon and authenticated by default, so a function is exposed unless it was
-- explicitly revoked - "I didn't write a grant" is not the same as "it's
-- private". Review the anon column: every `true` should be a deliberate
-- decision.

select
  p.proname                                                as function_name,
  pg_get_function_identity_arguments(p.oid)                as args,
  p.prosecdef                                              as security_definer,
  coalesce(p.proconfig::text, '(search_path not pinned)')  as config,
  has_function_privilege('anon', p.oid, 'execute')         as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
order by anon_can_execute desc, p.proname;
