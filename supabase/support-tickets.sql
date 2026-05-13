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
