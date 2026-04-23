create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  title text not null,
  scheduled_for timestamptz,
  scheduled_until timestamptz,
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
check (origin in ('member', 'host_apply'));

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

drop function if exists public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[]);
drop function if exists public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text);

create or replace function public.create_lobby_with_invites(
  p_game_id text,
  p_title text,
  p_scheduled_for timestamptz,
  p_scheduled_until timestamptz,
  p_is_private boolean,
  p_invited_profile_ids uuid[] default '{}',
  p_discord_guild_id text default null,
  p_discord_guild_name text default null,
  p_discord_guild_icon_url text default null
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
    nullif(btrim(p_discord_guild_id), ''),
    nullif(btrim(p_discord_guild_name), ''),
    nullif(btrim(p_discord_guild_icon_url), ''),
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

alter table public.lobbies enable row level security;
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
revoke all on function public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text) from public;
revoke all on function public.respond_to_lobby_invite(uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function public.apply_lobby_time_suggestion(uuid, uuid) from public;
revoke all on function public.cleanup_expired_lobby_response_history() from public;

grant execute on function public.can_view_lobby(uuid) to authenticated;
grant execute on function public.is_lobby_host(uuid) to authenticated;
grant execute on function public.can_view_lobby_member(uuid, uuid) to authenticated;
grant execute on function public.create_lobby_with_invites(text, text, timestamptz, timestamptz, boolean, uuid[], text, text, text) to authenticated;
grant execute on function public.respond_to_lobby_invite(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.apply_lobby_time_suggestion(uuid, uuid) to authenticated;
