create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  title text not null,
  scheduled_for timestamptz,
  scheduled_until timestamptz,
  meetup_details text,
  lobby_series_id uuid,
  series_occurrence_key timestamptz,
  discord_guild_id text,
  discord_guild_name text,
  discord_guild_icon_url text,
  is_private boolean not null default true,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.lobbies
add column if not exists scheduled_until timestamptz;

alter table public.lobbies
add column if not exists meetup_details text;

alter table public.lobbies
add column if not exists lobby_series_id uuid;

alter table public.lobbies
add column if not exists series_occurrence_key timestamptz;

alter table public.lobbies
add column if not exists discord_guild_id text;

alter table public.lobbies
add column if not exists discord_guild_name text;

alter table public.lobbies
add column if not exists discord_guild_icon_url text;

alter table public.lobbies
drop constraint if exists lobbies_scheduled_until_after_start;

alter table public.lobbies
add constraint lobbies_scheduled_until_after_start
check (scheduled_until is null or scheduled_for is null or scheduled_until > scheduled_for);

create table if not exists public.lobby_series (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  title text not null,
  meetup_details text,
  is_private boolean not null default true,
  frequency text not null default 'weekly',
  anchor_starts_at timestamptz not null,
  anchor_ends_at timestamptz,
  end_mode text not null default 'until_date',
  until_date date,
  occurrence_count integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lobby_series
add column if not exists meetup_details text;

alter table public.lobby_series
add column if not exists is_private boolean not null default true;

alter table public.lobby_series
add column if not exists frequency text not null default 'weekly';

alter table public.lobby_series
add column if not exists anchor_starts_at timestamptz;

alter table public.lobby_series
add column if not exists anchor_ends_at timestamptz;

alter table public.lobby_series
add column if not exists end_mode text not null default 'until_date';

alter table public.lobby_series
add column if not exists until_date date;

alter table public.lobby_series
add column if not exists occurrence_count integer;

alter table public.lobby_series
add column if not exists status text not null default 'active';

alter table public.lobby_series
add column if not exists updated_at timestamptz not null default now();

alter table public.lobby_series
drop constraint if exists lobby_series_frequency_check;

alter table public.lobby_series
add constraint lobby_series_frequency_check
check (frequency in ('weekly', 'biweekly'));

alter table public.lobby_series
drop constraint if exists lobby_series_anchor_end_after_start;

alter table public.lobby_series
add constraint lobby_series_anchor_end_after_start
check (anchor_ends_at is null or anchor_ends_at > anchor_starts_at);

alter table public.lobby_series
drop constraint if exists lobby_series_end_mode_check;

alter table public.lobby_series
add constraint lobby_series_end_mode_check
check (end_mode in ('until_date', 'occurrence_count'));

alter table public.lobby_series
drop constraint if exists lobby_series_end_mode_fields_check;

alter table public.lobby_series
add constraint lobby_series_end_mode_fields_check
check (
  (end_mode = 'until_date' and until_date is not null and occurrence_count is null)
  or (end_mode = 'occurrence_count' and occurrence_count is not null and occurrence_count >= 1 and until_date is null)
);

alter table public.lobby_series
drop constraint if exists lobby_series_status_check;

alter table public.lobby_series
add constraint lobby_series_status_check
check (status in ('active', 'ended'));

create table if not exists public.lobby_series_invitees (
  lobby_series_id uuid not null references public.lobby_series(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lobby_series_id, profile_id)
);

alter table public.lobbies
drop constraint if exists lobbies_lobby_series_id_fkey;

alter table public.lobbies
add constraint lobbies_lobby_series_id_fkey
foreign key (lobby_series_id)
references public.lobby_series(id)
on delete set null;

create unique index if not exists lobbies_series_occurrence_key_unique
on public.lobbies (lobby_series_id, series_occurrence_key)
where lobby_series_id is not null and series_occurrence_key is not null;

create table if not exists public.lobby_members (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  rsvp_status text not null default 'pending',
  response_comment text,
  suggested_start_at timestamptz,
  suggested_end_at timestamptz,
  responded_at timestamptz,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (lobby_id, profile_id)
);

alter table public.lobby_members
add column if not exists response_comment text;

alter table public.lobby_members
add column if not exists suggested_start_at timestamptz;

alter table public.lobby_members
add column if not exists suggested_end_at timestamptz;

alter table public.lobby_members
add column if not exists responded_at timestamptz;

alter table public.lobby_members
add column if not exists invited_at timestamptz not null default now();

alter table public.lobby_members
drop constraint if exists lobby_members_role_check;

alter table public.lobby_members
add constraint lobby_members_role_check
check (role in ('host', 'member'));

alter table public.lobby_members
drop constraint if exists lobby_members_rsvp_status_check;

alter table public.lobby_members
add constraint lobby_members_rsvp_status_check
check (rsvp_status in ('accepted', 'pending', 'declined', 'suggested_time'));

alter table public.lobby_members
drop constraint if exists lobby_members_suggested_time_complete;

alter table public.lobby_members
add constraint lobby_members_suggested_time_complete
check (
  rsvp_status <> 'suggested_time'
  or (
    suggested_start_at is not null
    and suggested_end_at is not null
    and suggested_end_at > suggested_start_at
  )
);

create table if not exists public.lobby_member_response_history (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  rsvp_status text not null,
  comment text,
  suggested_start_at timestamptz,
  suggested_end_at timestamptz,
  origin text not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.lobby_member_response_history
drop constraint if exists lobby_member_response_history_rsvp_status_check;

alter table public.lobby_member_response_history
add constraint lobby_member_response_history_rsvp_status_check
check (rsvp_status in ('accepted', 'pending', 'declined', 'suggested_time'));

alter table public.lobby_member_response_history
drop constraint if exists lobby_member_response_history_origin_check;

alter table public.lobby_member_response_history
add constraint lobby_member_response_history_origin_check
check (origin in ('member', 'host_apply', 'host_series_edit'));

alter table public.lobby_member_response_history
drop constraint if exists lobby_member_response_history_suggested_time_complete;

alter table public.lobby_member_response_history
add constraint lobby_member_response_history_suggested_time_complete
check (
  rsvp_status <> 'suggested_time'
  or (
    suggested_start_at is not null
    and suggested_end_at is not null
    and suggested_end_at > suggested_start_at
  )
);

create or replace function public.can_view_lobby(p_lobby_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.lobbies
    where id = p_lobby_id
      and host_profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.lobby_members
    where lobby_id = p_lobby_id
      and profile_id = auth.uid()
  );
end;
$$;

create or replace function public.is_lobby_host(p_lobby_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.lobbies
    where id = p_lobby_id
      and host_profile_id = auth.uid()
  );
end;
$$;

create or replace function public.can_view_lobby_member(p_lobby_id uuid, p_member_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return auth.uid() = p_member_profile_id
    or public.is_lobby_host(p_lobby_id);
end;
$$;

create or replace function public.is_lobby_series_host(p_lobby_series_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.lobby_series
    where id = p_lobby_series_id
      and host_profile_id = auth.uid()
  );
end;
$$;

create or replace function public.create_lobby_occurrence_internal(
  p_host_profile_id uuid,
  p_game_id text,
  p_title text,
  p_scheduled_for timestamptz,
  p_scheduled_until timestamptz,
  p_meetup_details text default null,
  p_is_private boolean default true,
  p_invited_profile_ids uuid[] default '{}',
  p_lobby_series_id uuid default null,
  p_series_occurrence_key timestamptz default null
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  created_lobby public.lobbies%rowtype;
begin
  if p_scheduled_for is not null and p_scheduled_until is not null and p_scheduled_until <= p_scheduled_for then
    raise exception 'Lobby end time must be after the start time';
  end if;

  insert into public.lobbies (
    host_profile_id,
    game_id,
    title,
    scheduled_for,
    scheduled_until,
    meetup_details,
    lobby_series_id,
    series_occurrence_key,
    discord_guild_id,
    discord_guild_name,
    discord_guild_icon_url,
    is_private,
    status
  )
  values (
    p_host_profile_id,
    p_game_id,
    p_title,
    p_scheduled_for,
    p_scheduled_until,
    nullif(btrim(p_meetup_details), ''),
    p_lobby_series_id,
    coalesce(p_series_occurrence_key, p_scheduled_for),
    null,
    null,
    null,
    p_is_private,
    'scheduled'
  )
  returning *
  into created_lobby;

  insert into public.lobby_members (
    lobby_id,
    profile_id,
    role,
    rsvp_status,
    responded_at,
    invited_at
  )
  values (
    created_lobby.id,
    p_host_profile_id,
    'host',
    'accepted',
    now(),
    now()
  )
  on conflict (lobby_id, profile_id) do update
  set
    role = excluded.role,
    rsvp_status = excluded.rsvp_status,
    responded_at = excluded.responded_at;

  insert into public.lobby_members (
    lobby_id,
    profile_id,
    role,
    rsvp_status,
    invited_at
  )
  select
    created_lobby.id,
    invited_profiles.profile_id,
    'member',
    'pending',
    now()
  from (
    select distinct unnest(coalesce(p_invited_profile_ids, '{}')) as profile_id
  ) invited_profiles
  where invited_profiles.profile_id is not null
    and invited_profiles.profile_id <> p_host_profile_id
  on conflict (lobby_id, profile_id) do nothing;

  return created_lobby;
end;
$$;

create or replace function public.get_lobby_series_occurrence_window(
  p_lobby_series_id uuid
)
returns table (
  sequence_number integer,
  occurrence_key timestamptz,
  scheduled_for timestamptz,
  scheduled_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  series_row public.lobby_series%rowtype;
  step_interval interval;
  current_start timestamptz;
  current_end timestamptz;
  occurrence_index integer := 1;
  future_count integer := 0;
  skip_count integer := 0;
  window_start timestamptz;
  window_end timestamptz;
  step_seconds numeric;
begin
  select *
  into series_row
  from public.lobby_series
  where id = p_lobby_series_id;

  if not found or series_row.status <> 'active' then
    return;
  end if;

  step_interval := case when series_row.frequency = 'biweekly' then interval '2 weeks' else interval '1 week' end;
  current_start := series_row.anchor_starts_at;
  current_end := series_row.anchor_ends_at;
  window_start := greatest(now(), series_row.anchor_starts_at);
  window_end := window_start + interval '6 weeks';
  step_seconds := extract(epoch from step_interval);

  if current_start < window_start and step_seconds > 0 then
    skip_count := floor(extract(epoch from (window_start - current_start)) / step_seconds)::integer;

    if skip_count > 0 then
      current_start := current_start + (step_interval * skip_count);
      if current_end is not null then
        current_end := current_end + (step_interval * skip_count);
      end if;
      occurrence_index := occurrence_index + skip_count;
    end if;
  end if;

  while occurrence_index <= 520 loop
    if series_row.end_mode = 'occurrence_count' and occurrence_index > coalesce(series_row.occurrence_count, 0) then
      exit;
    end if;

    if series_row.end_mode = 'until_date' and current_start::date > series_row.until_date then
      exit;
    end if;

    if current_start >= window_start then
      future_count := future_count + 1;
      sequence_number := future_count;
      occurrence_key := current_start;
      scheduled_for := current_start;
      scheduled_until := current_end;
      return next;

      if future_count >= 8 then
        exit;
      end if;
    end if;

    current_start := current_start + step_interval;
    if current_end is not null then
      current_end := current_end + step_interval;
    end if;
    occurrence_index := occurrence_index + 1;

    if current_start > window_end and future_count > 0 then
      exit;
    end if;
  end loop;
end;
$$;

create or replace function public.sync_lobby_series_occurrences(
  p_lobby_series_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  series_row public.lobby_series%rowtype;
  invited_profile_ids uuid[];
  occurrence_row record;
  generated_count integer := 0;
begin
  select *
  into series_row
  from public.lobby_series
  where id = p_lobby_series_id;

  if not found or series_row.status <> 'active' then
    return 0;
  end if;

  select coalesce(array_agg(profile_id order by created_at), '{}')
  into invited_profile_ids
  from public.lobby_series_invitees
  where lobby_series_id = p_lobby_series_id;

  for occurrence_row in
    select *
    from public.get_lobby_series_occurrence_window(p_lobby_series_id)
    order by sequence_number
  loop
    if exists (
      select 1
      from public.lobbies
      where lobby_series_id = p_lobby_series_id
        and series_occurrence_key = occurrence_row.occurrence_key
    ) then
      continue;
    end if;

    perform public.create_lobby_occurrence_internal(
      series_row.host_profile_id,
      series_row.game_id,
      series_row.title,
      occurrence_row.scheduled_for,
      occurrence_row.scheduled_until,
      series_row.meetup_details,
      series_row.is_private,
      invited_profile_ids,
      series_row.id,
      occurrence_row.occurrence_key
    );

    generated_count := generated_count + 1;
  end loop;

  return generated_count;
end;
$$;

create or replace function public.create_recurring_lobby_series(
  p_game_id text,
  p_title text,
  p_scheduled_for timestamptz,
  p_scheduled_until timestamptz,
  p_is_private boolean,
  p_invited_profile_ids uuid[] default '{}',
  p_meetup_details text default null,
  p_frequency text default 'weekly',
  p_end_mode text default 'until_date',
  p_until_date date default null,
  p_occurrence_count integer default null
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  created_series public.lobby_series%rowtype;
  created_lobby public.lobbies%rowtype;
  sanitized_title text := nullif(btrim(p_title), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if sanitized_title is null then
    raise exception 'Lobby title is required';
  end if;

  if p_scheduled_for is null then
    raise exception 'Recurring lobbies require a scheduled start time';
  end if;

  if p_scheduled_until is not null and p_scheduled_until <= p_scheduled_for then
    raise exception 'Lobby end time must be after the start time';
  end if;

  if p_frequency not in ('weekly', 'biweekly') then
    raise exception 'Unsupported recurrence frequency';
  end if;

  if p_end_mode not in ('until_date', 'occurrence_count') then
    raise exception 'Unsupported recurrence end mode';
  end if;

  if p_end_mode = 'until_date' then
    if p_until_date is null or p_until_date < p_scheduled_for::date then
      raise exception 'Recurring series end date must be on or after the first occurrence';
    end if;
    p_occurrence_count := null;
  else
    if p_occurrence_count is null or p_occurrence_count < 1 then
      raise exception 'Recurring series occurrence count must be at least 1';
    end if;
    p_until_date := null;
  end if;

  if (
    select count(*)
    from public.lobby_series
    where host_profile_id = auth.uid()
      and status = 'active'
  ) >= 10 then
    raise exception 'You already have the maximum number of active recurring series';
  end if;

  if exists (
    with invited_profiles as (
      select distinct unnest(coalesce(p_invited_profile_ids, '{}')) as profile_id
    )
    select 1
    from invited_profiles
    where profile_id is null
      or profile_id = auth.uid()
      or not exists (
        select 1
        from public.friends
        where profile_id = auth.uid()
          and friend_profile_id = invited_profiles.profile_id
      )
  ) then
    raise exception 'Invites are limited to accepted friends';
  end if;

  insert into public.lobby_series (
    host_profile_id,
    game_id,
    title,
    meetup_details,
    is_private,
    frequency,
    anchor_starts_at,
    anchor_ends_at,
    end_mode,
    until_date,
    occurrence_count,
    status,
    updated_at
  )
  values (
    auth.uid(),
    p_game_id,
    sanitized_title,
    nullif(btrim(p_meetup_details), ''),
    p_is_private,
    p_frequency,
    p_scheduled_for,
    p_scheduled_until,
    p_end_mode,
    p_until_date,
    p_occurrence_count,
    'active',
    now()
  )
  returning *
  into created_series;

  insert into public.lobby_series_invitees (lobby_series_id, profile_id)
  select
    created_series.id,
    invited_profiles.profile_id
  from (
    select distinct unnest(coalesce(p_invited_profile_ids, '{}')) as profile_id
  ) invited_profiles
  where invited_profiles.profile_id is not null
  on conflict (lobby_series_id, profile_id) do nothing;

  perform public.sync_lobby_series_occurrences(created_series.id);

  select *
  into created_lobby
  from public.lobbies
  where lobby_series_id = created_series.id
    and series_occurrence_key = created_series.anchor_starts_at
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Unable to create the first recurring lobby occurrence';
  end if;

  return created_lobby;
end;
$$;

create or replace function public.update_recurring_lobby_series_future(
  p_lobby_id uuid,
  p_game_id text,
  p_title text,
  p_scheduled_for timestamptz,
  p_scheduled_until timestamptz,
  p_is_private boolean,
  p_frequency text,
  p_end_mode text,
  p_until_date date default null,
  p_occurrence_count integer default null,
  p_meetup_details text default null
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  target_lobby public.lobbies%rowtype;
  old_series public.lobby_series%rowtype;
  new_series public.lobby_series%rowtype;
  updated_lobby public.lobbies%rowtype;
  sanitized_title text := nullif(btrim(p_title), '');
  reset_comment text := 'Series changed, please respond again.';
  should_reset_future boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if sanitized_title is null then
    raise exception 'Lobby title is required';
  end if;

  if p_scheduled_for is null then
    raise exception 'Recurring lobbies require a scheduled start time';
  end if;

  if p_scheduled_until is not null and p_scheduled_until <= p_scheduled_for then
    raise exception 'Lobby end time must be after the start time';
  end if;

  if p_frequency not in ('weekly', 'biweekly') then
    raise exception 'Unsupported recurrence frequency';
  end if;

  if p_end_mode not in ('until_date', 'occurrence_count') then
    raise exception 'Unsupported recurrence end mode';
  end if;

  if p_end_mode = 'until_date' then
    if p_until_date is null or p_until_date < p_scheduled_for::date then
      raise exception 'Recurring series end date must be on or after the new anchor occurrence';
    end if;
    p_occurrence_count := null;
  else
    if p_occurrence_count is null or p_occurrence_count < 1 then
      raise exception 'Recurring series occurrence count must be at least 1';
    end if;
    p_until_date := null;
  end if;

  select *
  into target_lobby
  from public.lobbies
  where id = p_lobby_id;

  if not found or target_lobby.lobby_series_id is null then
    raise exception 'Recurring lobby occurrence not found';
  end if;

  if target_lobby.host_profile_id <> auth.uid() then
    raise exception 'Only the host can edit future recurring occurrences';
  end if;

  select *
  into old_series
  from public.lobby_series
  where id = target_lobby.lobby_series_id;

  if not found then
    raise exception 'Recurring series not found';
  end if;

  insert into public.lobby_series (
    host_profile_id,
    game_id,
    title,
    meetup_details,
    is_private,
    frequency,
    anchor_starts_at,
    anchor_ends_at,
    end_mode,
    until_date,
    occurrence_count,
    status,
    updated_at
  )
  values (
    auth.uid(),
    p_game_id,
    sanitized_title,
    nullif(btrim(p_meetup_details), ''),
    p_is_private,
    p_frequency,
    p_scheduled_for,
    p_scheduled_until,
    p_end_mode,
    p_until_date,
    p_occurrence_count,
    'active',
    now()
  )
  returning *
  into new_series;

  insert into public.lobby_series_invitees (lobby_series_id, profile_id)
  select
    new_series.id,
    lobby_series_invitees.profile_id
  from public.lobby_series_invitees
  where lobby_series_invitees.lobby_series_id = old_series.id
  on conflict (lobby_series_id, profile_id) do nothing;

  should_reset_future := (
    target_lobby.game_id <> p_game_id
    or target_lobby.scheduled_for is distinct from p_scheduled_for
    or target_lobby.scheduled_until is distinct from p_scheduled_until
    or old_series.frequency <> p_frequency
  );

  update public.lobby_series
  set
    status = 'ended',
    updated_at = now()
  where id = old_series.id;

  with desired_occurrences as (
    select *
    from public.get_lobby_series_occurrence_window(new_series.id)
  ),
  existing_occurrences as (
    select
      lobbies.id,
      row_number() over (
        order by coalesce(lobbies.series_occurrence_key, lobbies.scheduled_for), lobbies.created_at
      ) as sequence_number
    from public.lobbies
    where lobbies.lobby_series_id = old_series.id
      and coalesce(lobbies.series_occurrence_key, lobbies.scheduled_for) >= coalesce(target_lobby.series_occurrence_key, target_lobby.scheduled_for)
  )
  update public.lobbies
  set
    lobby_series_id = new_series.id,
    series_occurrence_key = desired_occurrences.occurrence_key,
    game_id = p_game_id,
    title = sanitized_title,
    scheduled_for = desired_occurrences.scheduled_for,
    scheduled_until = desired_occurrences.scheduled_until,
    meetup_details = nullif(btrim(p_meetup_details), ''),
    is_private = p_is_private
  from existing_occurrences
  join desired_occurrences
    on desired_occurrences.sequence_number = existing_occurrences.sequence_number
  where public.lobbies.id = existing_occurrences.id;

  with desired_occurrences as (
    select count(*) as desired_count
    from public.get_lobby_series_occurrence_window(new_series.id)
  ),
  existing_occurrences as (
    select
      lobbies.id,
      row_number() over (
        order by coalesce(lobbies.series_occurrence_key, lobbies.scheduled_for), lobbies.created_at
      ) as sequence_number
    from public.lobbies
    where lobbies.lobby_series_id = old_series.id
      and coalesce(lobbies.series_occurrence_key, lobbies.scheduled_for) >= coalesce(target_lobby.series_occurrence_key, target_lobby.scheduled_for)
  )
  delete from public.lobbies
  where id in (
    select existing_occurrences.id
    from existing_occurrences
    cross join desired_occurrences
    where existing_occurrences.sequence_number > desired_occurrences.desired_count
  );

  perform public.sync_lobby_series_occurrences(new_series.id);

  if should_reset_future then
    with affected_members as (
      select
        lobby_members.lobby_id,
        lobby_members.profile_id
      from public.lobby_members
      join public.lobbies
        on public.lobbies.id = lobby_members.lobby_id
      where public.lobbies.lobby_series_id = new_series.id
        and coalesce(public.lobbies.series_occurrence_key, public.lobbies.scheduled_for) >= new_series.anchor_starts_at
        and lobby_members.role = 'member'
        and (
          lobby_members.rsvp_status <> 'pending'
          or lobby_members.response_comment is not null
          or lobby_members.suggested_start_at is not null
          or lobby_members.suggested_end_at is not null
          or lobby_members.responded_at is not null
        )
    ),
    updated_members as (
      update public.lobby_members
      set
        rsvp_status = 'pending',
        response_comment = null,
        suggested_start_at = null,
        suggested_end_at = null,
        responded_at = null
      where (lobby_id, profile_id) in (
        select affected_members.lobby_id, affected_members.profile_id
        from affected_members
      )
      returning lobby_id, profile_id
    )
    insert into public.lobby_member_response_history (
      lobby_id,
      profile_id,
      actor_profile_id,
      rsvp_status,
      comment,
      suggested_start_at,
      suggested_end_at,
      origin
    )
    select
      updated_members.lobby_id,
      updated_members.profile_id,
      auth.uid(),
      'pending',
      reset_comment,
      null,
      null,
      'host_series_edit'
    from updated_members;
  end if;

  select *
  into updated_lobby
  from public.lobbies
  where lobby_series_id = new_series.id
    and series_occurrence_key = new_series.anchor_starts_at
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Unable to update future recurring occurrences';
  end if;

  return updated_lobby;
end;
$$;

create or replace function public.sync_recurring_lobbies()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_series record;
  affected_count integer := 0;
  deleted_count integer := 0;
begin
  delete from public.lobbies
  where lobby_series_id is not null
    and coalesce(
      scheduled_until,
      scheduled_for,
      created_at
    ) < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  affected_count := affected_count + deleted_count;

  for current_series in
    select id
    from public.lobby_series
    where status = 'active'
  loop
    affected_count := affected_count + public.sync_lobby_series_occurrences(current_series.id);
  end loop;

  return affected_count;
end;
$$;

create or replace function public.get_profile_busy_blocks(
  p_profile_ids uuid[],
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns table (
  profile_id uuid,
  lobby_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  busy_status text,
  game_title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception 'A valid busy-block window is required';
  end if;

  return query
  with requested_profiles as (
    select distinct unnest(coalesce(p_profile_ids, '{}')) as requested_profile_id
  ),
  visible_profiles as (
    select requested_profiles.requested_profile_id as profile_id
    from requested_profiles
    where requested_profiles.requested_profile_id is not null
      and (
        requested_profiles.requested_profile_id = auth.uid()
        or exists (
          select 1
          from public.friends
          where friends.profile_id = auth.uid()
            and friends.friend_profile_id = requested_profiles.requested_profile_id
        )
      )
  ),
  host_blocks as (
    select
      lobbies.host_profile_id as profile_id,
      lobbies.id as lobby_id,
      lobbies.scheduled_for as starts_at,
      coalesce(lobbies.scheduled_until, lobbies.scheduled_for + interval '2 hours') as ends_at,
      case when lobbies.scheduled_until is null then 'maybe_busy' else 'busy' end as busy_status,
      case when profiles.busy_visibility = 'public' then games.title else null end as game_title
    from public.lobbies
    join visible_profiles
      on visible_profiles.profile_id = lobbies.host_profile_id
    join public.profiles
      on profiles.id = lobbies.host_profile_id
    left join public.games
      on games.id = lobbies.game_id
    where lobbies.status <> 'closed'
      and lobbies.scheduled_for is not null
      and tstzrange(
        lobbies.scheduled_for,
        coalesce(lobbies.scheduled_until, lobbies.scheduled_for + interval '2 hours'),
        '[)'
      ) && tstzrange(p_window_start, p_window_end, '[)')
  ),
  accepted_member_blocks as (
    select
      lobby_members.profile_id,
      lobbies.id as lobby_id,
      lobbies.scheduled_for as starts_at,
      coalesce(lobbies.scheduled_until, lobbies.scheduled_for + interval '2 hours') as ends_at,
      case when lobbies.scheduled_until is null then 'maybe_busy' else 'busy' end as busy_status,
      case when profiles.busy_visibility = 'public' then games.title else null end as game_title
    from public.lobby_members
    join public.lobbies
      on lobbies.id = lobby_members.lobby_id
    join visible_profiles
      on visible_profiles.profile_id = lobby_members.profile_id
    join public.profiles
      on profiles.id = lobby_members.profile_id
    left join public.games
      on games.id = lobbies.game_id
    where lobby_members.role = 'member'
      and lobby_members.rsvp_status = 'accepted'
      and lobbies.status <> 'closed'
      and lobbies.scheduled_for is not null
      and tstzrange(
        lobbies.scheduled_for,
        coalesce(lobbies.scheduled_until, lobbies.scheduled_for + interval '2 hours'),
        '[)'
      ) && tstzrange(p_window_start, p_window_end, '[)')
  )
  select *
  from host_blocks
  union all
  select *
  from accepted_member_blocks
  order by starts_at asc, profile_id asc;
end;
$$;

drop function if exists public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[]);
drop function if exists public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text);
drop function if exists public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text);

create or replace function public.create_lobby_with_invites(
  p_game_id text,
  p_title text,
  p_scheduled_for timestamptz,
  p_scheduled_until timestamptz,
  p_is_private boolean,
  p_invited_profile_ids uuid[] default '{}',
  p_meetup_details text default null
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  created_lobby public.lobbies%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_scheduled_for is not null and p_scheduled_until is not null and p_scheduled_until <= p_scheduled_for then
    raise exception 'Lobby end time must be after the start time';
  end if;

  if exists (
    with invited_profiles as (
      select distinct unnest(coalesce(p_invited_profile_ids, '{}')) as profile_id
    )
    select 1
    from invited_profiles
    where profile_id is null
      or profile_id = auth.uid()
      or not exists (
        select 1
        from public.friends
        where profile_id = auth.uid()
          and friend_profile_id = invited_profiles.profile_id
      )
  ) then
    raise exception 'Invites are limited to accepted friends';
  end if;

  insert into public.lobbies (
    host_profile_id,
    game_id,
    title,
    scheduled_for,
    scheduled_until,
    meetup_details,
    discord_guild_id,
    discord_guild_name,
    discord_guild_icon_url,
    is_private,
    status
  )
  values (
    auth.uid(),
    p_game_id,
    p_title,
    p_scheduled_for,
    p_scheduled_until,
    nullif(btrim(p_meetup_details), ''),
    null,
    null,
    null,
    p_is_private,
    'scheduled'
  )
  returning *
  into created_lobby;

  insert into public.lobby_members (
    lobby_id,
    profile_id,
    role,
    rsvp_status,
    responded_at,
    invited_at
  )
  values (
    created_lobby.id,
    auth.uid(),
    'host',
    'accepted',
    now(),
    now()
  )
  on conflict (lobby_id, profile_id) do update
  set
    role = excluded.role,
    rsvp_status = excluded.rsvp_status,
    responded_at = excluded.responded_at;

  insert into public.lobby_members (
    lobby_id,
    profile_id,
    role,
    rsvp_status,
    invited_at
  )
  select
    created_lobby.id,
    invited_profiles.profile_id,
    'member',
    'pending',
    now()
  from (
    select distinct unnest(coalesce(p_invited_profile_ids, '{}')) as profile_id
  ) invited_profiles
  where invited_profiles.profile_id is not null
  on conflict (lobby_id, profile_id) do nothing;

  return created_lobby;
end;
$$;

create or replace function public.respond_to_lobby_invite(
  p_lobby_id uuid,
  p_status text,
  p_comment text default null,
  p_suggested_start_at timestamptz default null,
  p_suggested_end_at timestamptz default null
)
returns public.lobby_members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_member public.lobby_members%rowtype;
  sanitized_comment text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('accepted', 'declined', 'suggested_time') then
    raise exception 'Unsupported lobby response status';
  end if;

  sanitized_comment := nullif(btrim(p_comment), '');

  if p_status = 'suggested_time' then
    if p_suggested_start_at is null or p_suggested_end_at is null then
      raise exception 'Suggested time requires a start and end time';
    end if;

    if p_suggested_end_at <= p_suggested_start_at then
      raise exception 'Suggested end time must be after the start time';
    end if;
  else
    p_suggested_start_at := null;
    p_suggested_end_at := null;
  end if;

  update public.lobby_members
  set
    rsvp_status = p_status,
    response_comment = sanitized_comment,
    suggested_start_at = p_suggested_start_at,
    suggested_end_at = p_suggested_end_at,
    responded_at = now()
  where lobby_id = p_lobby_id
    and profile_id = auth.uid()
    and role = 'member'
  returning *
  into updated_member;

  if not found then
    raise exception 'Lobby invite not found for the current user';
  end if;

  insert into public.lobby_member_response_history (
    lobby_id,
    profile_id,
    actor_profile_id,
    rsvp_status,
    comment,
    suggested_start_at,
    suggested_end_at,
    origin
  )
  values (
    p_lobby_id,
    auth.uid(),
    auth.uid(),
    p_status,
    sanitized_comment,
    p_suggested_start_at,
    p_suggested_end_at,
    'member'
  );

  return updated_member;
end;
$$;

create or replace function public.apply_lobby_time_suggestion(
  p_lobby_id uuid,
  p_profile_id uuid
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_lobby public.lobbies%rowtype;
  suggested_member public.lobby_members%rowtype;
  reset_comment text := 'Time changed, please respond again';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into updated_lobby
  from public.lobbies
  where id = p_lobby_id;

  if not found then
    raise exception 'Lobby not found';
  end if;

  if updated_lobby.host_profile_id <> auth.uid() then
    raise exception 'Only the host can apply a suggested time';
  end if;

  select *
  into suggested_member
  from public.lobby_members
  where lobby_id = p_lobby_id
    and profile_id = p_profile_id
    and role = 'member';

  if not found then
    raise exception 'Suggested member not found in this lobby';
  end if;

  if suggested_member.rsvp_status <> 'suggested_time'
    or suggested_member.suggested_start_at is null
    or suggested_member.suggested_end_at is null then
    raise exception 'This member does not have an active time suggestion';
  end if;

  update public.lobbies
  set
    scheduled_for = suggested_member.suggested_start_at,
    scheduled_until = suggested_member.suggested_end_at
  where id = p_lobby_id
  returning *
  into updated_lobby;

  update public.lobby_members
  set
    rsvp_status = 'accepted',
    suggested_start_at = null,
    suggested_end_at = null,
    responded_at = now()
  where lobby_id = p_lobby_id
    and profile_id = p_profile_id;

  insert into public.lobby_member_response_history (
    lobby_id,
    profile_id,
    actor_profile_id,
    rsvp_status,
    comment,
    suggested_start_at,
    suggested_end_at,
    origin
  )
  values (
    p_lobby_id,
    p_profile_id,
    auth.uid(),
    'accepted',
    'Suggested time applied by host.',
    updated_lobby.scheduled_for,
    updated_lobby.scheduled_until,
    'host_apply'
  );

  update public.lobby_members
  set
    rsvp_status = 'pending',
    response_comment = reset_comment,
    suggested_start_at = null,
    suggested_end_at = null,
    responded_at = now()
  where lobby_id = p_lobby_id
    and role = 'member'
    and profile_id <> p_profile_id;

  insert into public.lobby_member_response_history (
    lobby_id,
    profile_id,
    actor_profile_id,
    rsvp_status,
    comment,
    suggested_start_at,
    suggested_end_at,
    origin
  )
  select
    p_lobby_id,
    lobby_members.profile_id,
    auth.uid(),
    'pending',
    reset_comment,
    null,
    null,
    'host_apply'
  from public.lobby_members
  where lobby_id = p_lobby_id
    and role = 'member'
    and profile_id <> p_profile_id;

  return updated_lobby;
end;
$$;

create or replace function public.cleanup_expired_lobby_response_history()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.lobby_member_response_history history
  using public.lobbies lobby
  where lobby.id = history.lobby_id
    and coalesce(
      lobby.scheduled_until,
      lobby.scheduled_for + interval '1 hour',
      lobby.created_at + interval '1 hour'
    ) < now() - interval '24 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when insufficient_privilege then
      raise notice 'pg_cron could not be enabled automatically. Schedule cleanup_expired_lobby_response_history manually.';
      existing_job_id := null;
    when feature_not_supported then
      raise notice 'pg_cron is not available in this environment. Schedule cleanup_expired_lobby_response_history manually.';
      existing_job_id := null;
  end;

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    select jobid
    into existing_job_id
    from cron.job
    where jobname = 'cleanup-lobby-response-history'
    limit 1;

    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'cleanup-lobby-response-history',
      '15 5 * * *',
      $cron$select public.cleanup_expired_lobby_response_history();$cron$
    );
  end if;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when insufficient_privilege then
      raise notice 'pg_cron could not be enabled automatically. Schedule sync_recurring_lobbies manually.';
      existing_job_id := null;
    when feature_not_supported then
      raise notice 'pg_cron is not available in this environment. Schedule sync_recurring_lobbies manually.';
      existing_job_id := null;
  end;

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    select jobid
    into existing_job_id
    from cron.job
    where jobname = 'sync-recurring-lobbies'
    limit 1;

    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'sync-recurring-lobbies',
      '45 4 * * *',
      $cron$select public.sync_recurring_lobbies();$cron$
    );
  end if;
end;
$$;

alter table public.lobbies enable row level security;
alter table public.lobby_series enable row level security;
alter table public.lobby_series_invitees enable row level security;
alter table public.lobby_members enable row level security;
alter table public.lobby_member_response_history enable row level security;

drop policy if exists "Users can read joined or hosted lobbies" on public.lobbies;
create policy "Users can read joined or hosted lobbies"
on public.lobbies
for select
to authenticated
using (public.can_view_lobby(id));

drop policy if exists "Users can create hosted lobbies" on public.lobbies;

drop policy if exists "Hosts can update their lobbies" on public.lobbies;
create policy "Hosts can update their lobbies"
on public.lobbies
for update
to authenticated
using (public.is_lobby_host(id))
with check (public.is_lobby_host(id));

drop policy if exists "Users can read recurring series they can access" on public.lobby_series;
create policy "Users can read recurring series they can access"
on public.lobby_series
for select
to authenticated
using (
  auth.uid() = host_profile_id
  or exists (
    select 1
    from public.lobbies
    left join public.lobby_members
      on public.lobby_members.lobby_id = public.lobbies.id
      and public.lobby_members.profile_id = auth.uid()
    where public.lobbies.lobby_series_id = public.lobby_series.id
      and (
        public.lobbies.host_profile_id = auth.uid()
        or public.lobby_members.profile_id is not null
      )
  )
);

drop policy if exists "Hosts can create their recurring series" on public.lobby_series;
create policy "Hosts can create their recurring series"
on public.lobby_series
for insert
to authenticated
with check (auth.uid() = host_profile_id);

drop policy if exists "Hosts can update their recurring series" on public.lobby_series;
create policy "Hosts can update their recurring series"
on public.lobby_series
for update
to authenticated
using (auth.uid() = host_profile_id)
with check (auth.uid() = host_profile_id);

drop policy if exists "Hosts can delete their recurring series" on public.lobby_series;
create policy "Hosts can delete their recurring series"
on public.lobby_series
for delete
to authenticated
using (auth.uid() = host_profile_id);

drop policy if exists "Hosts can read their recurring invitees" on public.lobby_series_invitees;
create policy "Hosts can read their recurring invitees"
on public.lobby_series_invitees
for select
to authenticated
using (public.is_lobby_series_host(lobby_series_id));

drop policy if exists "Hosts can create their recurring invitees" on public.lobby_series_invitees;
create policy "Hosts can create their recurring invitees"
on public.lobby_series_invitees
for insert
to authenticated
with check (public.is_lobby_series_host(lobby_series_id));

drop policy if exists "Hosts can delete their recurring invitees" on public.lobby_series_invitees;
create policy "Hosts can delete their recurring invitees"
on public.lobby_series_invitees
for delete
to authenticated
using (public.is_lobby_series_host(lobby_series_id));

drop policy if exists "Users can read memberships for their lobbies" on public.lobby_members;
create policy "Users can read memberships for their lobbies"
on public.lobby_members
for select
to authenticated
using (public.can_view_lobby_member(lobby_id, profile_id));

drop policy if exists "Users can join their own membership rows" on public.lobby_members;

drop policy if exists "Users can read visible lobby response history" on public.lobby_member_response_history;
create policy "Users can read visible lobby response history"
on public.lobby_member_response_history
for select
to authenticated
using (public.can_view_lobby_member(lobby_id, profile_id));

revoke all on function public.can_view_lobby(uuid) from public;
revoke all on function public.is_lobby_host(uuid) from public;
revoke all on function public.can_view_lobby_member(uuid, uuid) from public;
revoke all on function public.is_lobby_series_host(uuid) from public;
revoke all on function public.create_lobby_occurrence_internal(uuid, text, text, timestamptz, timestamptz, text, boolean, uuid[], uuid, timestamptz) from public;
revoke all on function public.get_lobby_series_occurrence_window(uuid) from public;
revoke all on function public.sync_lobby_series_occurrences(uuid) from public;
revoke all on function public.create_recurring_lobby_series(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text, date, integer) from public;
revoke all on function public.update_recurring_lobby_series_future(uuid, text, text, timestamptz, timestamptz, boolean, text, text, date, integer, text) from public;
revoke all on function public.sync_recurring_lobbies() from public;
revoke all on function public.get_profile_busy_blocks(uuid[], timestamptz, timestamptz) from public;
revoke all on function public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text) from public;
revoke all on function public.respond_to_lobby_invite(uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function public.apply_lobby_time_suggestion(uuid, uuid) from public;
revoke all on function public.cleanup_expired_lobby_response_history() from public;

grant execute on function public.can_view_lobby(uuid) to authenticated;
grant execute on function public.is_lobby_host(uuid) to authenticated;
grant execute on function public.can_view_lobby_member(uuid, uuid) to authenticated;
grant execute on function public.is_lobby_series_host(uuid) to authenticated;
grant execute on function public.create_recurring_lobby_series(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text, date, integer) to authenticated;
grant execute on function public.update_recurring_lobby_series_future(uuid, text, text, timestamptz, timestamptz, boolean, text, text, date, integer, text) to authenticated;
grant execute on function public.get_profile_busy_blocks(uuid[], timestamptz, timestamptz) to authenticated;
grant execute on function public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text) to authenticated;
grant execute on function public.respond_to_lobby_invite(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.apply_lobby_time_suggestion(uuid, uuid) to authenticated;
