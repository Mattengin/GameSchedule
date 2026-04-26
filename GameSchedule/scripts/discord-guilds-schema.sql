create table if not exists public.profile_discord_guilds (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  discord_guild_id text not null,
  name text not null,
  icon_url text,
  is_owner boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (profile_id, discord_guild_id)
);

create index if not exists profile_discord_guilds_guild_profile_idx
  on public.profile_discord_guilds (discord_guild_id, profile_id);

alter table public.profile_discord_guilds enable row level security;

drop policy if exists "Users can read their Discord guild snapshots" on public.profile_discord_guilds;
create policy "Users can read their Discord guild snapshots"
on public.profile_discord_guilds
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their Discord guild snapshots" on public.profile_discord_guilds;
create policy "Users can insert their Discord guild snapshots"
on public.profile_discord_guilds
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their Discord guild snapshots" on public.profile_discord_guilds;
create policy "Users can update their Discord guild snapshots"
on public.profile_discord_guilds
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their Discord guild snapshots" on public.profile_discord_guilds;
create policy "Users can delete their Discord guild snapshots"
on public.profile_discord_guilds
for delete
to authenticated
using (auth.uid() = profile_id);

create or replace function public.replace_discord_guilds(p_guilds jsonb default '[]'::jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_guilds jsonb := coalesce(p_guilds, '[]'::jsonb);
  retained_guild_ids text[];
  replaced_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(normalized_guilds) <> 'array' then
    raise exception 'Guild payload must be a JSON array';
  end if;

  with parsed_guilds as (
    select
      auth.uid() as profile_id,
      nullif(btrim(guild_item ->> 'discord_guild_id'), '') as discord_guild_id,
      nullif(btrim(guild_item ->> 'name'), '') as name,
      nullif(btrim(guild_item ->> 'icon_url'), '') as icon_url,
      coalesce((guild_item ->> 'is_owner')::boolean, false) as is_owner
    from jsonb_array_elements(normalized_guilds) guild_item
  ),
  valid_guilds as (
    select distinct on (discord_guild_id)
      profile_id,
      discord_guild_id,
      name,
      icon_url,
      is_owner
    from parsed_guilds
    where discord_guild_id is not null
      and name is not null
    order by discord_guild_id
  ),
  upserted as (
    insert into public.profile_discord_guilds (
      profile_id,
      discord_guild_id,
      name,
      icon_url,
      is_owner,
      synced_at
    )
    select
      profile_id,
      discord_guild_id,
      name,
      icon_url,
      is_owner,
      now()
    from valid_guilds
    on conflict (profile_id, discord_guild_id) do update
    set
      name = excluded.name,
      icon_url = excluded.icon_url,
      is_owner = excluded.is_owner,
      synced_at = excluded.synced_at
    returning discord_guild_id
  )
  select
    array_agg(discord_guild_id),
    count(*)
  into retained_guild_ids, replaced_count
  from (
    select discord_guild_id from upserted
    union
    select discord_guild_id from valid_guilds
  ) retained;

  if retained_guild_ids is null or array_length(retained_guild_ids, 1) is null then
    delete from public.profile_discord_guilds
    where profile_id = auth.uid();
  else
    delete from public.profile_discord_guilds
    where profile_id = auth.uid()
      and not (discord_guild_id = any(retained_guild_ids));
  end if;

  return coalesce(replaced_count, 0);
end;
$$;

revoke all on function public.replace_discord_guilds(jsonb) from public;
grant execute on function public.replace_discord_guilds(jsonb) to authenticated;

delete from public.profile_discord_guilds;

drop function if exists public.get_discord_friend_suggestions(integer, integer);
drop function if exists public.search_discord_profiles(text, integer);
