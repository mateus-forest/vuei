create extension if not exists pgcrypto;

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null,
  generation_type text not null,
  success boolean not null default true,
  used_fallback boolean not null default false,
  openai_error text null,
  duration_ms integer not null default 0,
  model text null,
  created_at timestamptz not null default now(),
  constraint ai_generation_logs_source_check check (source in ('anonymous_landing', 'authenticated')),
  constraint ai_generation_logs_generation_type_check check (
    generation_type in ('preview', 'full_itinerary', 'adjustment', 'comparison')
  )
);

alter table public.ai_generation_logs enable row level security;

grant usage on schema public to service_role;
grant all on table public.ai_generation_logs to service_role;

notify pgrst, 'reload schema';
select pg_notification_queue_usage();
