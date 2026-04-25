alter table public.profiles
  add column if not exists discord_user_id text,
  add column if not exists discord_username text,
  add column if not exists discord_avatar_url text,
  add column if not exists discord_connected_at timestamptz;

create unique index if not exists profiles_discord_user_id_key
  on public.profiles (discord_user_id)
  where discord_user_id is not null;

create or replace function public.get_visible_profiles(
  p_profile_ids uuid[]
)
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
  viewer_primary_community_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select profiles.primary_community_id
  into viewer_primary_community_id
  from public.profiles
  where profiles.id = auth.uid();

  return query
  with requested_profiles as (
    select distinct requested_profile_id
    from unnest(coalesce(p_profile_ids, '{}'::uuid[])) requested_profile_id
    where requested_profile_id is not null
  ),
  visible_profile_ids as (
    select requested_profiles.requested_profile_id as profile_id
    from requested_profiles
    where requested_profiles.requested_profile_id = auth.uid()
      or exists (
        select 1
        from public.friends
        where friends.profile_id = auth.uid()
          and friends.friend_profile_id = requested_profiles.requested_profile_id
      )
      or (
        viewer_primary_community_id is not null
        and exists (
          select 1
          from public.profiles visible_profiles
          where visible_profiles.id = requested_profiles.requested_profile_id
            and visible_profiles.primary_community_id = viewer_primary_community_id
        )
      )
  )
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
  from public.profiles profiles
  join visible_profile_ids
    on visible_profile_ids.profile_id = profiles.id
  order by
    coalesce(lower(profiles.display_name), lower(profiles.username), ''),
    profiles.created_at desc;
end;
$$;

drop function if exists public.search_profiles(text, integer);
create function public.search_profiles(
  p_query text,
  p_limit integer default 6
)
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
  normalized_query text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := greatest(1, least(coalesce(p_limit, 6), 20));
  viewer_primary_community_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(normalized_query) < 2 then
    return;
  end if;

  select profiles.primary_community_id
  into viewer_primary_community_id
  from public.profiles
  where profiles.id = auth.uid();

  if viewer_primary_community_id is null then
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
  from public.profiles profiles
  where profiles.id <> auth.uid()
    and profiles.primary_community_id = viewer_primary_community_id
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

revoke all on function public.get_visible_profiles(uuid[]) from public;
grant execute on function public.get_visible_profiles(uuid[]) to authenticated;

revoke all on function public.search_profiles(text, integer) from public;
grant execute on function public.search_profiles(text, integer) to authenticated;
