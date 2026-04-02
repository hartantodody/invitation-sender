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
  opening_text_en text not null check (length(trim(opening_text_en)) > 0),
  closing_text_en text not null check (length(trim(closing_text_en)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invitation_settings_user_id_key unique (user_id)
);

alter table public.invitation_settings add column if not exists opening_text_en text;
alter table public.invitation_settings add column if not exists closing_text_en text;
update public.invitation_settings
set opening_text_en = opening_text
where opening_text_en is null or length(trim(opening_text_en)) = 0;
update public.invitation_settings
set closing_text_en = closing_text
where closing_text_en is null or length(trim(closing_text_en)) = 0;
alter table public.invitation_settings alter column opening_text_en set not null;
alter table public.invitation_settings alter column closing_text_en set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitation_settings_opening_text_en_check'
      and conrelid = 'public.invitation_settings'::regclass
  ) then
    alter table public.invitation_settings
      add constraint invitation_settings_opening_text_en_check
      check (length(trim(opening_text_en)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitation_settings_closing_text_en_check'
      and conrelid = 'public.invitation_settings'::regclass
  ) then
    alter table public.invitation_settings
      add constraint invitation_settings_closing_text_en_check
      check (length(trim(closing_text_en)) > 0);
  end if;
end $$;

drop trigger if exists set_invitation_settings_updated_at on public.invitation_settings;
create trigger set_invitation_settings_updated_at
before update on public.invitation_settings
for each row
execute function public.set_updated_at();

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text,
  guest_from text not null check (length(trim(guest_from)) > 0),
  query_param text not null check (length(trim(query_param)) > 0),
  shift smallint not null default 1,
  status text not null default 'pending' check (status in ('pending', 'sent')),
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

update public.guests set phone = null where phone is not null and length(trim(phone)) = 0;
alter table public.guests alter column phone drop not null;
alter table public.guests drop constraint if exists guests_phone_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guests_phone_optional_check'
      and conrelid = 'public.guests'::regclass
  ) then
    alter table public.guests
      add constraint guests_phone_optional_check
      check (phone is null or length(trim(phone)) > 0);
  end if;
end $$;

alter table public.guests add column if not exists guest_from text;
update public.guests set guest_from = 'Keluarga' where guest_from is null or length(trim(guest_from)) = 0;
alter table public.guests alter column guest_from set default 'Keluarga';
alter table public.guests alter column guest_from set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guests_guest_from_check'
      and conrelid = 'public.guests'::regclass
  ) then
    alter table public.guests
      add constraint guests_guest_from_check check (length(trim(guest_from)) > 0);
  end if;
end $$;

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
