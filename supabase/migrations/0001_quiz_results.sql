-- Quiz results storage. Anonymous inserts, no anonymous reads of the base
-- table at all — the public read path is a view (below) that structurally
-- excludes `email`, so leaking it would require a schema change, not just a
-- policy mistake.

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  variant text not null check (variant in ('choice', 'scale')),
  answers jsonb not null,
  scores jsonb not null,
  top_majors jsonb not null,
  email text
);

alter table public.quiz_results enable row level security;

create policy "anon can insert quiz results"
  on public.quiz_results for insert
  to anon
  with check (true);

-- No select policy for anon on the base table: even a future policy bug on
-- this table can't expose email, because anon has no grant on it at all.

create view public.quiz_results_public as
  select id, created_at, variant, answers, scores, top_majors
  from public.quiz_results;

grant select on public.quiz_results_public to anon;
