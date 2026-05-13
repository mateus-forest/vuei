-- Esse reparo foi pensado para um pagamento real já aprovado no Stripe
-- que ainda não creditou saldo no VUEI.
--
-- Antes de rodar:
-- 1. Preencha manualmente os valores abaixo.
-- 2. Confirme se não existe credit_transaction purchase para o mesmo pagamento.
-- 3. Rode apenas uma vez para o checkout correto.
--
-- replace_user_id: UUID do usuário dono da compra
-- replace_user_email: e-mail do usuário
-- replace_stripe_session_id: checkout.session.id do Stripe
-- replace_payment_id: UUID do payment existente no VUEI, se já houver

with target_payment as (
  select
    p.id,
    p.user_id,
    p.email,
    p.credits,
    p.credits_applied,
    p.stripe_session_id
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
      or ct.description = 'Compra de 5 créditos'
    )
  limit 1
)
select
  tp.id as payment_id,
  tp.user_id,
  tp.email,
  tp.credits,
  tp.credits_applied
from target_payment tp;

-- 2. Confira o saldo atual do usuário antes do reparo.
select
  p.id,
  p.email,
  p.credits
from public.profiles p
where p.id = 'replace_user_id';

-- 3. Reaplique exatamente 5 créditos uma única vez.
do $$
declare
  v_payment_id uuid;
  v_existing_purchase_id uuid;
begin
  select tp.id
  into v_payment_id
  from public.payments tp
  where tp.stripe_session_id = 'replace_stripe_session_id'
     or tp.id::text = 'replace_payment_id'
  limit 1;

  if v_payment_id is null then
    raise exception 'Pagamento não encontrado. Preencha stripe_session_id ou payment_id corretamente.';
  end if;

  select ct.id
  into v_existing_purchase_id
  from public.credit_transactions ct
  where ct.payment_id = v_payment_id
    and ct.type = 'purchase'
  limit 1;

  if v_existing_purchase_id is not null then
    raise notice 'Compra já reparada anteriormente. Nada foi alterado.';
    return;
  end if;

  update public.profiles
  set credits = coalesce(credits, 0) + 5
  where id = 'replace_user_id';

  insert into public.credit_transactions (
    id,
    user_id,
    email,
    type,
    credits,
    description,
    payment_id,
    created_at
  )
  values (
    gen_random_uuid(),
    'replace_user_id',
    'replace_user_email',
    'purchase',
    5,
    'Compra de 5 créditos',
    v_payment_id,
    now()
  );

  update public.payments
  set
    user_id = 'replace_user_id',
    email = 'replace_user_email',
    credits = 5,
    status = 'paid',
    credits_applied = true
  where id = v_payment_id;
end $$;
