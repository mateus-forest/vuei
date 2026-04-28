create extension if not exists pgcrypto;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  stripe_session_id text unique,
  stripe_payment_intent text,
  amount_cents integer,
  currency text default 'brl',
  status text,
  plan text,
  credits integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  type text,
  credits integer,
  description text,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  source text,
  prompt text,
  result jsonb,
  credits_used integer default 1,
  created_at timestamptz default now()
);

alter table public.payments enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.searches enable row level security;

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments"
on public.payments
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
create policy "Users can read own credit transactions"
on public.credit_transactions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own searches" on public.searches;
create policy "Users can read own searches"
on public.searches
for select
using (auth.uid() = user_id or user_id is null);
