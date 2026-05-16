alter table public.organizations
  add column if not exists logo_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_logo_url_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_logo_url_check
      check (logo_url is null or logo_url ~* '^https?://');
  end if;
end $$;
