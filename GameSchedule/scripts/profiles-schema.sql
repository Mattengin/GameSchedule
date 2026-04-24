create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  display_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists birthday_month integer,
  add column if not exists birthday_day integer,
  add column if not exists birthday_visibility text not null default 'private';

alter table public.profiles
  drop constraint if exists profiles_birthday_visibility_check;

alter table public.profiles
  add constraint profiles_birthday_visibility_check
  check (birthday_visibility in ('private', 'public'));

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

alter table public.profiles enable row level security;

create or replace function public.search_profiles(
  p_query text,
  p_limit integer default 6
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_query text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := greatest(1, least(coalesce(p_limit, 6), 20));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(normalized_query) < 2 then
    return;
  end if;

  return query
  select profiles.*
  from public.profiles profiles
  where profiles.id <> auth.uid()
    and (
      coalesce(lower(profiles.username), '') like '%' || normalized_query || '%'
      or coalesce(lower(profiles.display_name), '') like '%' || normalized_query || '%'
    )
  order by
    coalesce(lower(profiles.display_name), lower(profiles.username), ''),
    profiles.created_at desc
  limit safe_limit;
end;
$$;

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

revoke all on function public.search_profiles(text, integer) from public;
grant execute on function public.search_profiles(text, integer) to authenticated;
