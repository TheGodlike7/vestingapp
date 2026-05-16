create schema if not exists private;

alter table public.organizations
  add column if not exists kyb_status text not null default 'unverified',
  add column if not exists kyb_risk_level text not null default 'unknown',
  add column if not exists kyb_risk_score integer not null default 0,
  add column if not exists kyb_reviewed_at timestamptz,
  add column if not exists kyb_reviewed_by uuid,
  add column if not exists kyb_review_notes text,
  add column if not exists country_of_operation text,
  add column if not exists contact_email text,
  add column if not exists representative_role text,
  add column if not exists project_description text,
  add column if not exists source_of_funds_attestation boolean not null default false,
  add column if not exists sanctions_attestation boolean not null default false,
  add column if not exists non_custodial_attestation boolean not null default false,
  add column if not exists terms_attestation boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kyb_status_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kyb_status_check
      check (kyb_status in ('unverified', 'submitted', 'in_review', 'verified', 'needs_changes', 'rejected', 'suspended'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kyb_risk_level_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kyb_risk_level_check
      check (kyb_risk_level in ('unknown', 'low', 'medium', 'high'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kyb_risk_score_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kyb_risk_score_check
      check (kyb_risk_score between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kyb_review_notes_required_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kyb_review_notes_required_check
      check (
        kyb_status not in ('needs_changes', 'rejected', 'suspended')
        or (kyb_review_notes is not null and btrim(kyb_review_notes) <> '')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_trust_profile_required_fields_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_trust_profile_required_fields_check
      check (
        kyb_status not in ('submitted', 'in_review', 'verified')
        or (
          owner_full_name is not null
          and btrim(owner_full_name) <> ''
          and country_of_operation is not null
          and btrim(country_of_operation) <> ''
          and contact_email is not null
          and btrim(contact_email) <> ''
          and representative_role is not null
          and btrim(representative_role) <> ''
          and project_description is not null
          and btrim(project_description) <> ''
          and source_of_funds_attestation
          and sanctions_attestation
          and non_custodial_attestation
          and terms_attestation
          and (
            (
              organization_type = 'dao'
              and x_url is not null
              and btrim(x_url) <> ''
              and discord_url is not null
              and btrim(discord_url) <> ''
              and telegram_url is not null
              and btrim(telegram_url) <> ''
            )
            or (
              organization_type = 'company'
              and linkedin_url is not null
              and btrim(linkedin_url) <> ''
              and website_url is not null
              and btrim(website_url) <> ''
              and (
                (meta_url is not null and btrim(meta_url) <> '')
                or (instagram_url is not null and btrim(instagram_url) <> '')
              )
            )
          )
        )
      );
  end if;
end $$;

create table if not exists public.organization_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reviewed_by uuid not null,
  old_status text,
  new_status text not null,
  risk_score integer not null default 0,
  risk_level text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  constraint organization_reviews_status_check check (new_status in ('unverified', 'submitted', 'in_review', 'verified', 'needs_changes', 'rejected', 'suspended')),
  constraint organization_reviews_risk_level_check check (risk_level in ('unknown', 'low', 'medium', 'high')),
  constraint organization_reviews_risk_score_check check (risk_score between 0 and 100)
);

alter table public.organization_reviews enable row level security;

create or replace function private.is_super_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_owners
    where id = p_user_id
      and is_super_admin = true
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_super_admin(uuid) to authenticated;

create or replace function private.is_valid_public_url(p_value text)
returns boolean
language sql
immutable
as $$
  select p_value is null or btrim(p_value) = '' or p_value ~* '^https?://';
$$;

create or replace function private.organization_risk_level(p_score integer)
returns text
language sql
immutable
as $$
  select case
    when p_score >= 60 then 'high'
    when p_score >= 25 then 'medium'
    when p_score >= 0 then 'low'
    else 'unknown'
  end;
$$;

create or replace function private.calculate_organization_risk_score(
  p_organization_type text,
  p_owner_full_name text,
  p_country_of_operation text,
  p_contact_email text,
  p_representative_role text,
  p_project_description text,
  p_x_url text,
  p_discord_url text,
  p_telegram_url text,
  p_meta_url text,
  p_instagram_url text,
  p_linkedin_url text,
  p_website_url text,
  p_source_of_funds_attestation boolean,
  p_sanctions_attestation boolean,
  p_non_custodial_attestation boolean,
  p_terms_attestation boolean
)
returns integer
language plpgsql
immutable
as $$
declare
  v_score integer := 0;
begin
  if coalesce(btrim(p_owner_full_name), '') = '' then v_score := v_score + 10; end if;
  if coalesce(btrim(p_country_of_operation), '') = '' then v_score := v_score + 10; end if;
  if coalesce(btrim(p_contact_email), '') = '' then v_score := v_score + 10; end if;
  if coalesce(btrim(p_representative_role), '') = '' then v_score := v_score + 10; end if;
  if coalesce(btrim(p_project_description), '') = '' then v_score := v_score + 10; end if;

  if not private.is_valid_public_url(p_x_url) then v_score := v_score + 25; end if;
  if not private.is_valid_public_url(p_discord_url) then v_score := v_score + 25; end if;
  if not private.is_valid_public_url(p_telegram_url) then v_score := v_score + 25; end if;
  if not private.is_valid_public_url(p_meta_url) then v_score := v_score + 10; end if;
  if not private.is_valid_public_url(p_instagram_url) then v_score := v_score + 10; end if;
  if not private.is_valid_public_url(p_linkedin_url) then v_score := v_score + 25; end if;
  if not private.is_valid_public_url(p_website_url) then v_score := v_score + 25; end if;

  if p_organization_type = 'dao' then
    if coalesce(btrim(p_x_url), '') = '' then v_score := v_score + 35; end if;
    if coalesce(btrim(p_discord_url), '') = '' then v_score := v_score + 35; end if;
    if coalesce(btrim(p_telegram_url), '') = '' then v_score := v_score + 35; end if;
  elsif p_organization_type = 'company' then
    if coalesce(btrim(p_linkedin_url), '') = '' then v_score := v_score + 35; end if;
    if coalesce(btrim(p_website_url), '') = '' then v_score := v_score + 35; end if;
    if coalesce(btrim(p_meta_url), '') = '' and coalesce(btrim(p_instagram_url), '') = '' then v_score := v_score + 25; end if;
  else
    v_score := v_score + 35;
  end if;

  if not coalesce(p_source_of_funds_attestation, false) then v_score := v_score + 25; end if;
  if not coalesce(p_sanctions_attestation, false) then v_score := v_score + 45; end if;
  if not coalesce(p_non_custodial_attestation, false) then v_score := v_score + 15; end if;
  if not coalesce(p_terms_attestation, false) then v_score := v_score + 15; end if;

  return least(v_score, 100);
end;
$$;

create or replace function private.guard_and_score_organization_trust_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_is_super_admin boolean := private.is_super_admin(auth.uid());
  v_profile_changed boolean;
  v_review_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_profile_changed := true;
    v_review_changed := false;
  else
    v_profile_changed := row(
      new.name,
      new.owner_id,
      new.organization_type,
      new.owner_full_name,
      new.logo_url,
      new.country_of_operation,
      new.contact_email,
      new.representative_role,
      new.project_description,
      new.x_url,
      new.discord_url,
      new.telegram_url,
      new.meta_url,
      new.instagram_url,
      new.linkedin_url,
      new.website_url,
      new.source_of_funds_attestation,
      new.sanctions_attestation,
      new.non_custodial_attestation,
      new.terms_attestation
    ) is distinct from row(
      old.name,
      old.owner_id,
      old.organization_type,
      old.owner_full_name,
      old.logo_url,
      old.country_of_operation,
      old.contact_email,
      old.representative_role,
      old.project_description,
      old.x_url,
      old.discord_url,
      old.telegram_url,
      old.meta_url,
      old.instagram_url,
      old.linkedin_url,
      old.website_url,
      old.source_of_funds_attestation,
      old.sanctions_attestation,
      old.non_custodial_attestation,
      old.terms_attestation
    );

    v_review_changed := row(
      new.kyb_status,
      new.kyb_reviewed_at,
      new.kyb_reviewed_by,
      new.kyb_review_notes
    ) is distinct from row(
      old.kyb_status,
      old.kyb_reviewed_at,
      old.kyb_reviewed_by,
      old.kyb_review_notes
    );
  end if;

  if tg_op = 'UPDATE' and v_review_changed and not v_is_super_admin then
    raise exception 'Only superadmins can update organization review fields';
  end if;

  if new.kyc_profile_submitted and v_profile_changed then
    new.kyb_risk_score := private.calculate_organization_risk_score(
      new.organization_type,
      new.owner_full_name,
      new.country_of_operation,
      new.contact_email,
      new.representative_role,
      new.project_description,
      new.x_url,
      new.discord_url,
      new.telegram_url,
      new.meta_url,
      new.instagram_url,
      new.linkedin_url,
      new.website_url,
      new.source_of_funds_attestation,
      new.sanctions_attestation,
      new.non_custodial_attestation,
      new.terms_attestation
    );
    new.kyb_risk_level := private.organization_risk_level(new.kyb_risk_score);
    new.kyb_status := 'submitted';
    new.kyc_submitted_at := coalesce(new.kyc_submitted_at, now());
    new.kyb_reviewed_at := null;
    new.kyb_reviewed_by := null;
    new.kyb_review_notes := null;
  end if;

  if v_is_super_admin and v_review_changed then
    if new.kyb_status in ('needs_changes', 'rejected', 'suspended')
      and coalesce(btrim(new.kyb_review_notes), '') = '' then
      raise exception 'Review notes are required for needs_changes, rejected, or suspended decisions';
    end if;

    new.kyb_reviewed_at := coalesce(new.kyb_reviewed_at, now());
    new.kyb_reviewed_by := coalesce(new.kyb_reviewed_by, auth.uid());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.audit_organization_review_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_super_admin(auth.uid())
    and row(new.kyb_status, new.kyb_review_notes) is distinct from row(old.kyb_status, old.kyb_review_notes) then
    insert into public.organization_reviews (
      organization_id,
      reviewed_by,
      old_status,
      new_status,
      risk_score,
      risk_level,
      notes
    ) values (
      new.id,
      auth.uid(),
      old.kyb_status,
      new.kyb_status,
      new.kyb_risk_score,
      new.kyb_risk_level,
      new.kyb_review_notes
    );
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_guard_and_score_trust_profile on public.organizations;
create trigger organizations_guard_and_score_trust_profile
  before insert or update on public.organizations
  for each row
  execute function private.guard_and_score_organization_trust_profile();

drop trigger if exists organizations_audit_review_decision on public.organizations;
create trigger organizations_audit_review_decision
  after update on public.organizations
  for each row
  execute function private.audit_organization_review_decision();

drop policy if exists "organization reviews are visible to owners and superadmins" on public.organization_reviews;
create policy "organization reviews are visible to owners and superadmins"
  on public.organization_reviews
  for select
  to authenticated
  using (
    private.is_super_admin((select auth.uid()))
    or exists (
      select 1
      from public.organizations o
      join public.project_owners po on po.wallet_address = o.owner_id
      where o.id = organization_reviews.organization_id
        and po.id = (select auth.uid())
    )
  );

create index if not exists organizations_kyb_review_queue_idx
  on public.organizations (kyb_status, kyb_risk_level, kyb_risk_score desc, updated_at desc);

create index if not exists organization_reviews_organization_created_idx
  on public.organization_reviews (organization_id, created_at desc);
