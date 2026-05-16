create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_web3_wallet(wallet_address text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.identities as identities
    where identities.user_id = auth.uid()
      and identities.provider = 'web3'
      and identities.provider_id = wallet_address
  );
$$;

revoke all on function private.has_web3_wallet(text) from public;
grant execute on function private.has_web3_wallet(text) to authenticated;

drop policy if exists "Recipients can view their own schedules" on public.vesting_schedules;
drop policy if exists "Users can view schedules" on public.vesting_schedules;
drop policy if exists "Recipient can claim tokens" on public.vesting_schedules;
drop policy if exists "Update schedules only with active subscription" on public.vesting_schedules;

create policy "Claimers can view schedules for their signed wallet"
  on public.vesting_schedules
  for select
  to authenticated
  using (private.has_web3_wallet(recipient_wallet));

create policy "Claimers can view their own claim history"
  on public.claim_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vesting_schedules as schedules
      where schedules.id = claim_history.schedule_id
        and private.has_web3_wallet(schedules.recipient_wallet)
    )
  );

create policy "Project owners can view claim history for their schedules"
  on public.claim_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vesting_schedules as schedules
      join public.vesting_projects as projects
        on projects.id = schedules.project_id
      where schedules.id = claim_history.schedule_id
        and projects.owner_id = auth.uid()
    )
  );
