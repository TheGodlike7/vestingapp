create or replace function private.is_valid_public_url(p_value text)
returns boolean
language sql
immutable
as $$
  select
    p_value is null
    or btrim(p_value) = ''
    or (
      length(btrim(p_value)) <= 2048
      and btrim(p_value) ~* '^https?://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
      and btrim(p_value) !~ '[[:space:]<>"''{}|\\^`\[\]]'
    );
$$;

create or replace function private.validate_organization_url_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_invalid_fields text[] := array[]::text[];
begin
  if not private.is_valid_public_url(new.logo_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Logo URL');
  end if;

  if not private.is_valid_public_url(new.x_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'X account URL');
  end if;

  if not private.is_valid_public_url(new.discord_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Discord server URL');
  end if;

  if not private.is_valid_public_url(new.telegram_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Telegram group URL');
  end if;

  if not private.is_valid_public_url(new.meta_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Meta/Facebook URL');
  end if;

  if not private.is_valid_public_url(new.instagram_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Instagram URL');
  end if;

  if not private.is_valid_public_url(new.linkedin_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'LinkedIn URL');
  end if;

  if not private.is_valid_public_url(new.website_url) then
    v_invalid_fields := array_append(v_invalid_fields, 'Main website URL');
  end if;

  if array_length(v_invalid_fields, 1) is not null then
    raise exception 'Invalid organization URL field(s): %. Use full public http(s) URLs such as https://example.com.',
      array_to_string(v_invalid_fields, ', ')
      using errcode = '22023';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_public_url_fields_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_public_url_fields_check
      check (
        private.is_valid_public_url(logo_url)
        and private.is_valid_public_url(x_url)
        and private.is_valid_public_url(discord_url)
        and private.is_valid_public_url(telegram_url)
        and private.is_valid_public_url(meta_url)
        and private.is_valid_public_url(instagram_url)
        and private.is_valid_public_url(linkedin_url)
        and private.is_valid_public_url(website_url)
      )
      not valid;
  end if;
end $$;

drop trigger if exists organizations_validate_url_fields on public.organizations;
create trigger organizations_validate_url_fields
  before insert or update of
    logo_url,
    x_url,
    discord_url,
    telegram_url,
    meta_url,
    instagram_url,
    linkedin_url,
    website_url
  on public.organizations
  for each row
  execute function private.validate_organization_url_fields();
