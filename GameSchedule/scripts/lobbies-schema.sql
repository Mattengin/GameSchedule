create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  title text not null,
  scheduled_for timestamptz,
  is_private boolean not null default true,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.lobby_members (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  rsvp_status text not null default 'pending' check (rsvp_status in ('accepted', 'pending', 'declined')),
  created_at timestamptz not null default now(),
  primary key (lobby_id, profile_id)
);

alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;

drop policy if exists "Users can read joined or hosted lobbies" on public.lobbies;
create policy "Users can read joined or hosted lobbies"
on public.lobbies
for select
to authenticated
using (auth.uid() = host_profile_id);

drop policy if exists "Users can create hosted lobbies" on public.lobbies;
create policy "Users can create hosted lobbies"
on public.lobbies
for insert
to authenticated
with check (auth.uid() = host_profile_id);

drop policy if exists "Hosts can update their lobbies" on public.lobbies;
create policy "Hosts can update their lobbies"
on public.lobbies
for update
to authenticated
using (auth.uid() = host_profile_id)
with check (auth.uid() = host_profile_id);

drop policy if exists "Users can read memberships for their lobbies" on public.lobby_members;
create policy "Users can read memberships for their lobbies"
on public.lobby_members
for select
to authenticated
using (
  auth.uid() = profile_id
  or exists (
    select 1
    from public.lobbies
    where lobbies.id = lobby_members.lobby_id
      and lobbies.host_profile_id = auth.uid()
  )
);

drop policy if exists "Users can join their own membership rows" on public.lobby_members;
create policy "Users can join their own membership rows"
on public.lobby_members
for insert
to authenticated
with check (auth.uid() = profile_id);
