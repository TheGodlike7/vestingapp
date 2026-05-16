alter table public.claim_history
  add column if not exists token_price_usd_at_claim numeric,
  add column if not exists claim_value_usd numeric,
  add column if not exists claim_executed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'claim_history_value_snapshots_non_negative_check'
      and conrelid = 'public.claim_history'::regclass
  ) then
    alter table public.claim_history
      add constraint claim_history_value_snapshots_non_negative_check
      check (
        (token_price_usd_at_claim is null or token_price_usd_at_claim >= 0)
        and (claim_value_usd is null or claim_value_usd >= 0)
      );
  end if;
end $$;

create index if not exists claim_history_schedule_executed_idx
  on public.claim_history (schedule_id, claim_executed_at desc);
