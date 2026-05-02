create table if not exists public.pending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_id_prefix text not null,
  status text not null default 'pending',
  amount_usdc numeric(20, 6) not null,
  token_mint text not null,
  business_wallet text not null,
  network text not null default 'devnet',
  tx_signature text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pending_payments_status_check check (status in ('pending', 'completed', 'expired')),
  constraint pending_payments_amount_positive check (amount_usdc > 0),
  constraint pending_payments_expiry_after_creation check (expires_at > created_at)
);

alter table public.pending_payments enable row level security;

drop policy if exists "pending payments are visible to their owner" on public.pending_payments;
create policy "pending payments are visible to their owner"
  on public.pending_payments
  for select
  to authenticated
  using (user_id = (select auth.uid())::text);

create unique index if not exists pending_payments_one_pending_per_user_key
  on public.pending_payments (user_id)
  where status = 'pending';

create unique index if not exists pending_payments_user_id_prefix_key
  on public.pending_payments (user_id_prefix);

create unique index if not exists pending_payments_tx_signature_key
  on public.pending_payments (tx_signature)
  where tx_signature is not null;

create index if not exists pending_payments_user_status_expires_idx
  on public.pending_payments (user_id, status, expires_at desc);

create unique index if not exists processed_transactions_signature_key
  on public.processed_transactions (signature);

create unique index if not exists subscriptions_transaction_signature_key
  on public.subscriptions (transaction_signature)
  where transaction_signature is not null;

create index if not exists subscriptions_owner_status_expires_idx
  on public.subscriptions (owner_id, status, expires_at desc);

create index if not exists processed_transactions_status_created_idx
  on public.processed_transactions (status, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'processed_transactions_status_check'
      and conrelid = 'public.processed_transactions'::regclass
  ) then
    alter table public.processed_transactions
      add constraint processed_transactions_status_check
      check (status in ('processing', 'completed', 'failed'));
  end if;
end $$;

create or replace function public.complete_subscription_payment(
  p_payment_id uuid,
  p_signature text,
  p_owner_id uuid,
  p_months_paid integer,
  p_amount_usdc numeric,
  p_wallet text
)
returns table(subscription_id uuid, expires_at timestamptz)
language plpgsql
set search_path = public
as $$
declare
  v_payment public.pending_payments%rowtype;
  v_subscription_id uuid;
  v_current_expires_at timestamptz;
  v_base_expires_at timestamptz;
  v_new_expires_at timestamptz;
begin
  if p_months_paid < 1 then
    raise exception 'months_paid must be at least 1';
  end if;

  if p_amount_usdc <= 0 then
    raise exception 'amount_usdc must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));

  update public.pending_payments
  set
    status = 'completed',
    tx_signature = p_signature,
    completed_at = now(),
    updated_at = now()
  where id = p_payment_id
    and user_id = p_owner_id::text
    and status = 'pending'
    and expires_at > now()
    and tx_signature is null
  returning * into v_payment;

  if not found then
    raise exception 'pending payment is not available';
  end if;

  select id, expires_at
  into v_subscription_id, v_current_expires_at
  from public.subscriptions
  where owner_id = p_owner_id
    and status = 'active'
    and expires_at > now()
  order by expires_at desc, created_at desc
  limit 1
  for update;

  v_base_expires_at := greatest(coalesce(v_current_expires_at, now()), now());
  v_new_expires_at := v_base_expires_at + make_interval(months => p_months_paid);

  if v_subscription_id is null then
    insert into public.subscriptions (
      owner_id,
      status,
      plan,
      amount_usd,
      started_at,
      expires_at,
      transaction_signature,
      plan_max_projects
    ) values (
      p_owner_id,
      'active',
      'starter',
      p_amount_usdc,
      now(),
      v_new_expires_at,
      p_signature,
      2
    )
    returning id into v_subscription_id;
  else
    update public.subscriptions
    set
      amount_usd = coalesce(amount_usd, 0) + p_amount_usdc,
      expires_at = v_new_expires_at,
      transaction_signature = p_signature,
      plan = 'starter',
      status = 'active',
      plan_max_projects = coalesce(plan_max_projects, 2)
    where id = v_subscription_id;
  end if;

  update public.project_owners
  set
    plan = 'starter',
    is_active = true,
    wallet_address = coalesce(nullif(wallet_address, ''), p_wallet)
  where id = p_owner_id;

  update public.processed_transactions
  set
    status = 'completed',
    error = null,
    amount = p_amount_usdc,
    wallet = p_wallet,
    last_retry = null
  where signature = p_signature;

  return query select v_subscription_id, v_new_expires_at;
end;
$$;

revoke all on function public.complete_subscription_payment(uuid, text, uuid, integer, numeric, text) from anon;
revoke all on function public.complete_subscription_payment(uuid, text, uuid, integer, numeric, text) from authenticated;
grant execute on function public.complete_subscription_payment(uuid, text, uuid, integer, numeric, text) to service_role;
