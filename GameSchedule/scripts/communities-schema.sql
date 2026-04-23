create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  discord_guild_id text,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

alter table public.profiles
  add column if not exists primary_community_id uuid references public.communities(id) on delete set null;

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

drop policy if exists "Users can read their communities" on public.communities;
create policy "Users can read their communities"
on public.communities
for select
to authenticated
using (
  id = (
    select primary_community_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "Users can read members in their communities" on public.community_members;
create policy "Users can read members in their communities"
on public.community_members
for select
to authenticated
using (
  community_id = (
    select primary_community_id
    from public.profiles
    where id = auth.uid()
  )
);

create or replace function public.generate_community_invite_code()
returns text
language plpgsql
as $$
declare
  next_code text;
begin
  loop
    next_code := substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    exit when not exists (
      select 1
      from public.communities
      where invite_code = next_code
    );
  end loop;

  return next_code;
end;
$$;

create or replace function public.create_community(p_name text)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  created_community public.communities;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Community name is required';
  end if;

  insert into public.communities (name, invite_code, created_by_profile_id)
  values (trim(p_name), public.generate_community_invite_code(), auth.uid())
  returning * into created_community;

  insert into public.community_members (community_id, profile_id, role)
  values (created_community.id, auth.uid(), 'owner')
  on conflict (community_id, profile_id) do update
  set role = excluded.role;

  update public.profiles
  set primary_community_id = created_community.id
  where id = auth.uid();

  return created_community;
end;
$$;

create or replace function public.join_community_by_invite(p_invite_code text)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_community public.communities;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into matched_community
  from public.communities
  where lower(invite_code) = lower(trim(coalesce(p_invite_code, '')));

  if not found then
    raise exception 'Invite code not found';
  end if;

  insert into public.community_members (community_id, profile_id, role)
  values (matched_community.id, auth.uid(), 'member')
  on conflict (community_id, profile_id) do nothing;

  update public.profiles
  set primary_community_id = matched_community.id
  where id = auth.uid();

  return matched_community;
end;
$$;

revoke all on function public.generate_community_invite_code() from public;
grant execute on function public.generate_community_invite_code() to authenticated;

revoke all on function public.create_community(text) from public;
grant execute on function public.create_community(text) to authenticated;

revoke all on function public.join_community_by_invite(text) from public;
grant execute on function public.join_community_by_invite(text) to authenticated;
