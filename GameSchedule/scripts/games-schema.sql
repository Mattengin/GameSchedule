create table if not exists public.games (
  id text primary key,
  title text not null unique,
  genre text not null,
  platform text not null,
  player_count text not null,
  description text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists "Authenticated users can read games" on public.games;
create policy "Authenticated users can read games"
on public.games
for select
to authenticated
using (true);

insert into public.games (id, title, genre, platform, player_count, description, is_featured)
values
  (
    'helix-arena',
    'Helix Arena',
    'Hero Shooter',
    'PC / Console',
    '3-5 players',
    'Fast team-based matches with hero abilities and short queue times.',
    true
  ),
  (
    'drift-legends-x',
    'Drift Legends X',
    'Racing',
    'PC / Console',
    '2-8 players',
    'Arcade racing nights with custom lobbies and private party queues.',
    false
  ),
  (
    'deep-raid',
    'Deep Raid',
    'Extraction',
    'PC',
    '2-4 players',
    'High-risk co-op missions with short planning sessions and long-term loot.',
    true
  ),
  (
    'skyforge-party',
    'Skyforge Party',
    'MMO',
    'Cross-platform',
    '4-6 players',
    'Dungeon runs and weekly guild goals for a repeat squad.',
    false
  ),
  (
    'pixel-strike-zero',
    'Pixel Strike Zero',
    'Arena Shooter',
    'PC',
    '4-10 players',
    'Retro-styled matches that work well for fast private lobby sessions.',
    false
  ),
  (
    'wild-rally-online',
    'Wild Rally Online',
    'Racing',
    'Cross-platform',
    '2-12 players',
    'Chaotic off-road playlists with short races and easy drop-in play.',
    true
  ),
  (
    'void-divers',
    'Void Divers',
    'Co-op Action',
    'PC / Console',
    '2-4 players',
    'Mission-based co-op with rotating objectives and squad builds.',
    true
  ),
  (
    'castle-circuit',
    'Castle Circuit',
    'Party Strategy',
    'PC / Mobile',
    '2-6 players',
    'Short tactical rounds with low setup cost and high rematch potential.',
    false
  )
on conflict (id) do update
set
  title = excluded.title,
  genre = excluded.genre,
  platform = excluded.platform,
  player_count = excluded.player_count,
  description = excluded.description,
  is_featured = excluded.is_featured;
