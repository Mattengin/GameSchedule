create table if not exists public.profile_games (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);

create table if not exists public.favorite_games (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);

create table if not exists public.roulette_pool_entries (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);

alter table public.profile_games enable row level security;
alter table public.favorite_games enable row level security;
alter table public.roulette_pool_entries enable row level security;

drop policy if exists "Users can read their library games" on public.profile_games;
create policy "Users can read their library games"
on public.profile_games
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their library games" on public.profile_games;
create policy "Users can insert their library games"
on public.profile_games
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their library games" on public.profile_games;
create policy "Users can delete their library games"
on public.profile_games
for delete
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can read their favorite games" on public.favorite_games;
create policy "Users can read their favorite games"
on public.favorite_games
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their favorite games" on public.favorite_games;
create policy "Users can insert their favorite games"
on public.favorite_games
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their favorite games" on public.favorite_games;
create policy "Users can delete their favorite games"
on public.favorite_games
for delete
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can read their roulette pool" on public.roulette_pool_entries;
create policy "Users can read their roulette pool"
on public.roulette_pool_entries
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their roulette pool" on public.roulette_pool_entries;
create policy "Users can insert their roulette pool"
on public.roulette_pool_entries
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their roulette pool" on public.roulette_pool_entries;
create policy "Users can delete their roulette pool"
on public.roulette_pool_entries
for delete
to authenticated
using (auth.uid() = profile_id);

insert into public.profile_games (profile_id, game_id)
select favorite_games.profile_id, favorite_games.game_id
from public.favorite_games
on conflict (profile_id, game_id) do nothing;

insert into public.profile_games (profile_id, game_id)
select roulette_pool_entries.profile_id, roulette_pool_entries.game_id
from public.roulette_pool_entries
on conflict (profile_id, game_id) do nothing;

do $$
begin
  if to_regclass('public.lobbies') is not null then
    insert into public.profile_games (profile_id, game_id)
    select distinct lobbies.host_profile_id, lobbies.game_id
    from public.lobbies
    on conflict (profile_id, game_id) do nothing;
  end if;
end;
$$;

alter table public.favorite_games
  drop constraint if exists favorite_games_profile_game_membership_fkey;

alter table public.favorite_games
  add constraint favorite_games_profile_game_membership_fkey
  foreign key (profile_id, game_id)
  references public.profile_games(profile_id, game_id)
  on delete cascade;

alter table public.roulette_pool_entries
  drop constraint if exists roulette_pool_entries_profile_game_membership_fkey;

alter table public.roulette_pool_entries
  add constraint roulette_pool_entries_profile_game_membership_fkey
  foreign key (profile_id, game_id)
  references public.profile_games(profile_id, game_id)
  on delete cascade;

create or replace function public.remove_game_from_library(p_game_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.favorite_games
  where profile_id = auth.uid()
    and game_id = p_game_id;

  delete from public.roulette_pool_entries
  where profile_id = auth.uid()
    and game_id = p_game_id;

  delete from public.profile_games
  where profile_id = auth.uid()
    and game_id = p_game_id;
end;
$$;

revoke all on function public.remove_game_from_library(text) from public;
grant execute on function public.remove_game_from_library(text) to authenticated;
