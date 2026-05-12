-- Preencha os valores abaixo antes de executar.
-- Esse reparo foi pensado para um pagamento real jÃ¡ aprovado no Stripe
-- que ainda nÃ£o creditou saldo no VUEI.

begin;

-- 1. Informe manualmente os dados do caso real.
-- replace_user_id: UUID do usuÃ¡rio dono da compra
-- replace_user_email: e-mail do usuÃ¡rio
-- replace_stripe_session_id: checkout.session.id do Stripe
-- replace_payment_id: UUID do payment existente no VUEI, se jÃ¡ houver

with target_payment as (
  select p.*
  from public.payments p
  where p.stripe_session_id = 'replace_stripe_session_id'
     or p.id::text = 'replace_payment_id'
  limit 1
),
existing_purchase as (
  select ct.id
  from public.credit_transactions ct
  left join target_payment tp on tp.id = ct.payment_id
  where ct.type = 'purchase'
    and (
      ct.payment_id = tp.id
      or ct.description = 'Compra de 5 crÃ©ditos'
    )
  limit 1
)
select
  'payment_check' as step,
  tp.id as payment_id,
  tp.user_id,
  tp.email,
  tp.status,
  tp.plan,
  tp.credits,
  tp.credits_applied
from target_payment tp;

select
  'profile_check' as step,
  p.id as user_id,
  p.email,
  p.credits as current_credits
from public.profiles p
where p.id = 'replace_user_id';

-- 2. Garanta que o profile exista com saldo inicial 0, se precisar.
insert into public.profiles (id, email, credits, role)
values ('replace_user_id', 'replace_user_email', 0, 'user')
on conflict (id) do nothing;

-- 3. Reaplique exatamente 5 crÃ©ditos uma Ãºnica vez.
do $$
declare
  v_payment_id uuid;
  v_existing_tx uuid;
begin
  select p.id
  into v_payment_id
  from public.payments p
  where p.stripe_session_id = 'replace_stripe_session_id'
     or p.id::text = 'replace_payment_id'
  limit 1;

  if v_payment_id is null then
    raise exception 'Pagamento nÃ£o encontrado. Preencha stripe_session_id ou payment_id corretamente.';
  end if;

  select ct.id
  into v_existing_tx
  from public.credit_transactions ct
  where ct.payment_id = v_payment_id
    and ct.type = 'purchase'
  limit 1;

  if v_existing_tx is not null then
    raise notice 'Compra jÃ¡ reparada anteriormente. Nada foi alterado.';
    return;
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + 5
  where id = 'replace_user_id';

  insert into public.credit_transactions (id, user_id, email, type, credits, description, payment_id)
  values (
    gen_random_uuid(),
    'replace_user_id',
    'replace_user_email',
    'purchase',
    5,
    'Compra de 5 crÃ©ditos',
    v_payment_id
  );

  update public.payments
  set
    user_id = 'replace_user_id',
    email = 'replace_user_email',
    status = 'paid',
    plan = 'pack_5',
    credits = 5,
    credits_applied = true
  where id = v_payment_id;
end $$;

select
  'final_profile' as step,
  p.id as user_id,
  p.credits as updated_credits
from public.profiles p
where p.id = 'replace_user_id';

commit;
