-- The direct-UPDATE-policy approach in 0002 turned out to be unreliable in
-- practice: Supabase grants `anon` broad SELECT/UPDATE privileges on every
-- column of a new table by default (a platform default, not something we
-- configured), so the only real protection for `email` is that there is no
-- SELECT *policy* for anon on this table. But returning the updated row
-- after a write (what a plain `.update().select()` needs to confirm success)
-- is itself a read-shaped operation that requires a SELECT policy - so a
-- direct UPDATE can never reliably report back whether it worked, without
-- adding a SELECT policy that would also make `email` readable to anyone.
--
-- This function is the standard Supabase pattern for "write plus a
-- confirmation signal, no row-data exposure": it runs as its owner
-- (SECURITY DEFINER bypasses RLS internally, since the owner is the table
-- owner), performs its own set-once check, and returns only a boolean -
-- never any column value, including email.

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
  return updated_count > 0;
end;
$$;

grant execute on function public.subscribe_quiz_result(uuid, text) to anon;

-- No longer needed now that writes go through the function above (which
-- bypasses RLS as its owner) - revoking narrows the direct attack surface,
-- so anon can no longer UPDATE this table directly via a raw REST call at
-- all, only through the vetted function.
drop policy if exists "anon can set email once, only while it is still null" on public.quiz_results;
revoke update (email) on public.quiz_results from anon;
