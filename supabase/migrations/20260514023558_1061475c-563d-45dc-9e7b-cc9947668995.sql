create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.api_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_cache_fetched_at_idx on public.api_cache (fetched_at);

alter table public.api_cache enable row level security;

-- No policies = no access for anon/authenticated roles.
-- Service-role bypasses RLS, which is what edge functions use.

create trigger api_cache_set_updated_at
before update on public.api_cache
for each row execute function public.set_updated_at();