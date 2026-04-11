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

alter table public.favorite_games enable row level security;
alter table public.roulette_pool_entries enable row level security;

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
