alter table public.organizations
  add column if not exists organization_type text not null default 'company',
  add column if not exists owner_full_name text,
  add column if not exists x_url text,
  add column if not exists discord_url text,
  add column if not exists telegram_url text,
  add column if not exists meta_url text,
  add column if not exists instagram_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists kyc_profile_submitted boolean not null default false,
  add column if not exists kyc_submitted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_type_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_type_check
      check (organization_type in ('dao', 'company'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_kyc_required_fields_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_kyc_required_fields_check
      check (
        not kyc_profile_submitted
        or (
          owner_full_name is not null
          and btrim(owner_full_name) <> ''
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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_official_links_url_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_official_links_url_check
      check (
        (x_url is null or x_url ~* '^https?://')
        and (discord_url is null or discord_url ~* '^https?://')
        and (telegram_url is null or telegram_url ~* '^https?://')
        and (meta_url is null or meta_url ~* '^https?://')
        and (instagram_url is null or instagram_url ~* '^https?://')
        and (linkedin_url is null or linkedin_url ~* '^https?://')
        and (website_url is null or website_url ~* '^https?://')
      );
  end if;
end $$;

create index if not exists organizations_type_kyc_idx
  on public.organizations (organization_type, kyc_profile_submitted);
