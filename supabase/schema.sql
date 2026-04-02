create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.invitation_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_url text not null check (length(trim(base_url)) > 0),
  opening_text text not null check (length(trim(opening_text)) > 0),
  closing_text text not null check (length(trim(closing_text)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invitation_settings_user_id_key unique (user_id)
);

drop trigger if exists set_invitation_settings_updated_at on public.invitation_settings;
create trigger set_invitation_settings_updated_at
before update on public.invitation_settings
for each row
execute function public.set_updated_at();

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text not null check (length(trim(phone)) > 0),
  query_param text not null check (length(trim(query_param)) > 0),
  shift smallint not null default 1,
  status text not null default 'pending' check (status in ('pending', 'sent')),
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.guests add column if not exists shift smallint;
update public.guests set shift = 1 where shift is null;
alter table public.guests alter column shift set default 1;
alter table public.guests alter column shift set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guests_shift_check'
      and conrelid = 'public.guests'::regclass
  ) then
    alter table public.guests
      add constraint guests_shift_check check (shift in (1, 2, 3));
  end if;
end $$;

create unique index if not exists guests_user_query_param_idx
  on public.guests (user_id, query_param);

drop trigger if exists set_guests_updated_at on public.guests;
create trigger set_guests_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

alter table public.invitation_settings enable row level security;
alter table public.guests enable row level security;

drop policy if exists "users_manage_own_invitation_settings" on public.invitation_settings;
create policy "users_manage_own_invitation_settings"
on public.invitation_settings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_guests" on public.guests;
create policy "users_manage_own_guests"
on public.guests
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
