-- Lets a completed result be updated with an opt-in email afterward, via
-- the separate "Subscribe for updates" action on the results screen
-- (results always save anonymously with no email; this is the only path
-- that ever writes one). Scoped narrowly: anon can only ever set email
-- once, from null, never overwrite or clear it, and can only touch the
-- email column - not variant/answers/scores/top_majors.

create policy "anon can set email once, only while it is still null"
  on public.quiz_results for update
  to anon
  using (email is null)
  with check (email is not null);

grant update (email) on public.quiz_results to anon;
