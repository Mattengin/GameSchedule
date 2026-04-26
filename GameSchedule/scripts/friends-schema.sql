create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  addressee_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  unique (requester_profile_id, addressee_profile_id),
  check (requester_profile_id <> addressee_profile_id)
);

create table if not exists public.friends (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  friend_profile_id uuid not null references public.profiles(id) on delete cascade,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, friend_profile_id),
  check (profile_id <> friend_profile_id)
);

create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists friend_groups_profile_name_lower_key
  on public.friend_groups (profile_id, lower(name));

create unique index if not exists friend_groups_id_profile_id_key
  on public.friend_groups (id, profile_id);

create table if not exists public.friend_group_members (
  group_id uuid not null,
  profile_id uuid not null,
  friend_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, friend_profile_id),
  check (profile_id <> friend_profile_id),
  constraint friend_group_members_group_owner_fkey
    foreign key (group_id, profile_id)
    references public.friend_groups(id, profile_id)
    on delete cascade,
  constraint friend_group_members_friendship_fkey
    foreign key (profile_id, friend_profile_id)
    references public.friends(profile_id, friend_profile_id)
    on delete cascade
);

alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;

drop policy if exists "Authenticated users can read all profiles" on public.profiles;

drop policy if exists "Users can read their friend requests" on public.friend_requests;
create policy "Users can read their friend requests"
on public.friend_requests
for select
to authenticated
using (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id);

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = requester_profile_id);

drop policy if exists "Participants can update their friend requests" on public.friend_requests;
create policy "Participants can update their friend requests"
on public.friend_requests
for update
to authenticated
using (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id)
with check (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id);

drop policy if exists "Users can read their friends" on public.friends;
create policy "Users can read their friends"
on public.friends
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can add their own friendship rows" on public.friends;
create policy "Users can add their own friendship rows"
on public.friends
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their own friendship rows" on public.friends;
create policy "Users can update their own friendship rows"
on public.friends
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Participants can delete friendship rows" on public.friends;
create policy "Participants can delete friendship rows"
on public.friends
for delete
to authenticated
using (auth.uid() = profile_id or auth.uid() = friend_profile_id);

drop policy if exists "Users can read their friend groups" on public.friend_groups;
create policy "Users can read their friend groups"
on public.friend_groups
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can create their friend groups" on public.friend_groups;
create policy "Users can create their friend groups"
on public.friend_groups
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their friend groups" on public.friend_groups;
create policy "Users can update their friend groups"
on public.friend_groups
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their friend groups" on public.friend_groups;
create policy "Users can delete their friend groups"
on public.friend_groups
for delete
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can read their friend group memberships" on public.friend_group_members;
create policy "Users can read their friend group memberships"
on public.friend_group_members
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can create their friend group memberships" on public.friend_group_members;
create policy "Users can create their friend group memberships"
on public.friend_group_members
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their friend group memberships" on public.friend_group_members;
create policy "Users can delete their friend group memberships"
on public.friend_group_members
for delete
to authenticated
using (auth.uid() = profile_id);

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.friend_requests%rowtype;
begin
  select *
  into request_row
  from public.friend_requests
  where id = p_request_id;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Friend request is not pending';
  end if;

  if auth.uid() <> request_row.addressee_profile_id then
    raise exception 'Only the addressee can accept this request';
  end if;

  insert into public.friends (profile_id, friend_profile_id, is_favorite)
  values
    (request_row.requester_profile_id, request_row.addressee_profile_id, false),
    (request_row.addressee_profile_id, request_row.requester_profile_id, false)
  on conflict (profile_id, friend_profile_id) do nothing;

  delete from public.friend_requests
  where id = p_request_id;
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;
