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

alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;

drop policy if exists "Authenticated users can read all profiles" on public.profiles;
create policy "Authenticated users can read all profiles"
on public.profiles
for select
to authenticated
using (true);

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

drop policy if exists "Participants can add friendship rows" on public.friends;
create policy "Participants can add friendship rows"
on public.friends
for insert
to authenticated
with check (auth.uid() = profile_id or auth.uid() = friend_profile_id);

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
