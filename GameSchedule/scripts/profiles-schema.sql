create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  friend_code text,
  avatar_url text,
  display_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists birthday_month integer,
  add column if not exists birthday_day integer,
  add column if not exists birthday_visibility text not null default 'private',
  add column if not exists busy_visibility text not null default 'public';

alter table public.profiles
  add column if not exists friend_code text;

alter table public.profiles
  drop constraint if exists profiles_birthday_visibility_check;

alter table public.profiles
  add constraint profiles_birthday_visibility_check
  check (birthday_visibility in ('private', 'public'));

alter table public.profiles
  drop constraint if exists profiles_busy_visibility_check;

alter table public.profiles
  add constraint profiles_busy_visibility_check
  check (busy_visibility in ('private', 'public'));

alter table public.profiles
  drop constraint if exists profiles_birthday_pair_check;

alter table public.profiles
  add constraint profiles_birthday_pair_check
  check (
    (birthday_month is null and birthday_day is null)
    or (
      birthday_month in (1, 3, 5, 7, 8, 10, 12)
      and birthday_day between 1 and 31
    )
    or (
      birthday_month in (4, 6, 9, 11)
      and birthday_day between 1 and 30
    )
    or (
      birthday_month = 2
      and birthday_day between 1 and 29
    )
  );

create or replace function public.generate_friend_code()
returns text
language plpgsql
as $$
declare
  next_code text;
  raw_code text;
begin
  loop
    raw_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
    next_code :=
      'GS-' ||
      substring(raw_code from 1 for 4) ||
      '-' ||
      substring(raw_code from 5 for 4) ||
      '-' ||
      substring(raw_code from 9 for 4);

    exit when not exists (
      select 1
      from public.profiles
      where lower(friend_code) = lower(next_code)
    );
  end loop;

  return next_code;
end;
$$;

do $$
declare
  profile_row record;
begin
  for profile_row in
    select id
    from public.profiles
    where friend_code is null
      or btrim(friend_code) = ''
  loop
    update public.profiles
    set friend_code = public.generate_friend_code()
    where id = profile_row.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column friend_code set default public.generate_friend_code();

create unique index if not exists profiles_friend_code_lower_key
  on public.profiles (lower(friend_code));

alter table public.profiles
  alter column friend_code set not null;

create or replace function public.lookup_friend_code(p_code text)
returns table (
  id uuid,
  username text,
  avatar_url text,
  display_name text,
  birthday_label text,
  is_discord_connected boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(coalesce(p_code, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if normalized_code = '' then
    return;
  end if;

  return query
  select
    profiles.id,
    profiles.username,
    coalesce(nullif(btrim(profiles.avatar_url), ''), nullif(btrim(profiles.discord_avatar_url), '')) as avatar_url,
    profiles.display_name,
    case
      when profiles.birthday_visibility = 'public'
        and profiles.birthday_month is not null
        and profiles.birthday_day is not null
      then to_char(make_date(2000, profiles.birthday_month, profiles.birthday_day), 'FMMonth') || ' ' || profiles.birthday_day::text
      else null
    end as birthday_label,
    profiles.discord_user_id is not null as is_discord_connected
  from public.profiles
  where lower(profiles.friend_code) = lower(normalized_code)
    and profiles.id <> auth.uid()
    and not exists (
      select 1
      from public.friends
      where friends.profile_id = auth.uid()
        and friends.friend_profile_id = profiles.id
    )
    and not exists (
      select 1
      from public.friend_requests
      where friend_requests.status = 'pending'
        and (
          (
            friend_requests.requester_profile_id = auth.uid()
            and friend_requests.addressee_profile_id = profiles.id
          )
          or (
            friend_requests.addressee_profile_id = auth.uid()
            and friend_requests.requester_profile_id = profiles.id
          )
        )
    )
  limit 1;
end;
$$;

create or replace function public.regenerate_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  next_code := public.generate_friend_code();

  update public.profiles
  set friend_code = next_code
  where id = auth.uid();

  return next_code;
end;
$$;

revoke all on function public.generate_friend_code() from public;
grant execute on function public.generate_friend_code() to authenticated;

revoke all on function public.lookup_friend_code(text) from public;
grant execute on function public.lookup_friend_code(text) to authenticated;

revoke all on function public.regenerate_friend_code() from public;
grant execute on function public.regenerate_friend_code() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read all profiles" on public.profiles;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to public
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to public
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to public
using (auth.uid() = id)
with check (auth.uid() = id);
