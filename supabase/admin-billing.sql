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
  credits_applied boolean default false,
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

alter table public.payments
add column if not exists credits_applied boolean default false;

create or replace function public.apply_stripe_credit_purchase(
  p_payment_id uuid,
  p_user_id uuid,
  p_credits integer,
  p_email text,
  p_description text
)
returns table (
  applied boolean,
  current_credits integer,
  reason text
)
language plpgsql
security definer
as $$
declare
  v_payment public.payments%rowtype;
  v_transaction_id uuid;
  v_current_credits integer;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    return query select false, null::integer, 'payment_not_found'::text;
    return;
  end if;

  if coalesce(v_payment.credits_applied, false) then
    select credits
    into v_current_credits
    from public.profiles
    where id = p_user_id;

    return query select false, coalesce(v_current_credits, 0), 'already_applied'::text;
    return;
  end if;

  insert into public.profiles (id, email, credits, role)
  values (p_user_id, coalesce(p_email, ''), 0, 'user')
  on conflict (id) do nothing;

  select id
  into v_transaction_id
  from public.credit_transactions
  where payment_id = p_payment_id
  limit 1;

  if v_transaction_id is not null then
    select credits
    into v_current_credits
    from public.profiles
    where id = p_user_id;

    update public.payments
    set
      user_id = p_user_id,
      email = coalesce(p_email, email),
      credits = p_credits,
      status = 'paid',
      credits_applied = true
    where id = p_payment_id;

    return query select false, coalesce(v_current_credits, 0), 'existing_transaction'::text;
    return;
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + p_credits
  where id = p_user_id
  returning credits into v_current_credits;

  insert into public.credit_transactions (id, user_id, email, type, credits, description, payment_id)
  values (gen_random_uuid(), p_user_id, p_email, 'purchase', p_credits, p_description, p_payment_id);

  update public.payments
  set
    user_id = p_user_id,
    email = coalesce(p_email, email),
    credits = p_credits,
    status = 'paid',
    credits_applied = true
  where id = p_payment_id;

  return query select true, coalesce(v_current_credits, 0), 'applied'::text;
end;
$$;
