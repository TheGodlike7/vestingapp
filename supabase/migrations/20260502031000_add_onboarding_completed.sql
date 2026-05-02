alter table public.project_owners
  add column if not exists onboarding_completed boolean not null default false;

create index if not exists project_owners_onboarding_completed_idx
  on public.project_owners (onboarding_completed);
