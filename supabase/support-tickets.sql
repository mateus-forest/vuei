create extension if not exists pgcrypto;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null,
  subject text,
  message text not null,
  status text default 'open',
  priority text default 'normal',
  related_search_id uuid references public.searches(id) on delete set null,
  related_payment_id uuid references public.payments(id) on delete set null,
  admin_note text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz null,
  constraint support_tickets_category_check check (
    category in (
      'credits_not_received',
      'credit_consumed_error',
      'simulation_not_generated',
      'download_issue',
      'itinerary_issue',
      'payment_refund',
      'other'
    )
  ),
  constraint support_tickets_status_check check (status in ('open', 'in_review', 'resolved', 'canceled')),
  constraint support_tickets_priority_check check (priority in ('low', 'normal', 'high'))
);

alter table public.support_tickets enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert on table public.support_tickets to authenticated;
grant all on table public.support_tickets to service_role;

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_support_ticket_updated_at on public.support_tickets;
create trigger set_support_ticket_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_ticket_updated_at();

drop policy if exists "Users can insert own support tickets" on public.support_tickets;
create policy "Users can insert own support tickets"
on public.support_tickets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own support tickets" on public.support_tickets;
create policy "Users can read own support tickets"
on public.support_tickets
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.create_support_ticket(
  p_user_id uuid,
  p_email text,
  p_category text,
  p_subject text,
  p_message text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets;
begin
  insert into public.support_tickets (
    user_id,
    email,
    category,
    subject,
    message,
    status,
    priority
  )
  values (
    p_user_id,
    p_email,
    p_category,
    nullif(trim(coalesce(p_subject, '')), ''),
    trim(p_message),
    'open',
    'normal'
  )
  returning *
  into v_ticket;

  return v_ticket;
end;
$$;

grant execute on function public.create_support_ticket(uuid, text, text, text, text) to service_role;

create or replace function public.support_tickets_debug_check()
returns table (
  table_exists boolean,
  schema_name text
)
language sql
security definer
set search_path = public
as $$
  select to_regclass('public.support_tickets') is not null as table_exists, 'public'::text as schema_name;
$$;

grant execute on function public.support_tickets_debug_check() to service_role;

notify pgrst, 'reload schema';
select pg_notification_queue_usage();
