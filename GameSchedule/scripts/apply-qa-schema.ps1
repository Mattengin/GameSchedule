param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [string]$ProjectRef = "utvqkqxdhxonuxwrogda"
)

$ErrorActionPreference = "Stop"

function Invoke-SupabaseQuery {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Query
  )

  $payload = @{
    query = $Query
    parameters = @()
  } | ConvertTo-Json -Compress -Depth 6

  $payloadPath = Join-Path $env:TEMP "$Name.qa-query.json"
  Set-Content -Path $payloadPath -Value $payload -NoNewline

  try {
    $response = & curl.exe -sS -X POST "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
      -H "Authorization: Bearer $Token" `
      -H "Content-Type: application/json" `
      --data-binary "@$payloadPath"
  } finally {
    Remove-Item -LiteralPath $payloadPath -Force -ErrorAction SilentlyContinue
  }

  if ($LASTEXITCODE -ne 0) {
    throw "curl failed for $Name"
  }

  if ($response -match '"message"\s*:') {
    throw "Supabase query failed for ${Name}: $response"
  }

  Write-Output "Applied $Name"
}

$queries = @(
  @{ Name = "profiles-table"; Query = "create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique, avatar_url text, display_name text, onboarding_complete boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());" },
  @{ Name = "profiles-birthday-columns"; Query = "alter table public.profiles add column if not exists birthday_month integer, add column if not exists birthday_day integer, add column if not exists birthday_visibility text not null default 'private';" },
  @{ Name = "profiles-birthday-visibility-check"; Query = "alter table public.profiles drop constraint if exists profiles_birthday_visibility_check; alter table public.profiles add constraint profiles_birthday_visibility_check check (birthday_visibility in ('private', 'public'));" },
  @{ Name = "profiles-birthday-pair-check"; Query = "alter table public.profiles drop constraint if exists profiles_birthday_pair_check; alter table public.profiles add constraint profiles_birthday_pair_check check ((birthday_month is null and birthday_day is null) or (birthday_month in (1, 3, 5, 7, 8, 10, 12) and birthday_day between 1 and 31) or (birthday_month in (4, 6, 9, 11) and birthday_day between 1 and 30) or (birthday_month = 2 and birthday_day between 1 and 29));" },
  @{ Name = "profiles-rls"; Query = "alter table public.profiles enable row level security;" },
  @{ Name = "profiles-search-function"; Query = "create or replace function public.search_profiles(p_query text, p_limit integer default 6) returns setof public.profiles language plpgsql security definer set search_path = public as $$ declare normalized_query text := lower(trim(coalesce(p_query, ''))); safe_limit integer := greatest(1, least(coalesce(p_limit, 6), 20)); begin if auth.uid() is null then raise exception 'Authentication required'; end if; if char_length(normalized_query) < 2 then return; end if; return query select profiles.* from public.profiles profiles where profiles.id <> auth.uid() and (coalesce(lower(profiles.username), '') like '%' || normalized_query || '%' or coalesce(lower(profiles.display_name), '') like '%' || normalized_query || '%') order by coalesce(lower(profiles.display_name), lower(profiles.username), ''), profiles.created_at desc limit safe_limit; end; $$;" },
  @{ Name = "profiles-policy-select-self-drop"; Query = "drop policy if exists ""Users can view their own profile"" on public.profiles;" },
  @{ Name = "profiles-policy-select-self"; Query = "create policy ""Users can view their own profile"" on public.profiles for select to public using (auth.uid() = id);" },
  @{ Name = "profiles-policy-insert-drop"; Query = "drop policy if exists ""Users can insert their own profile"" on public.profiles;" },
  @{ Name = "profiles-policy-insert"; Query = "create policy ""Users can insert their own profile"" on public.profiles for insert to public with check (auth.uid() = id);" },
  @{ Name = "profiles-policy-update-drop"; Query = "drop policy if exists ""Users can update their own profile"" on public.profiles;" },
  @{ Name = "profiles-policy-update"; Query = "create policy ""Users can update their own profile"" on public.profiles for update to public using (auth.uid() = id) with check (auth.uid() = id);" },
  @{ Name = "profiles-search-revoke"; Query = "revoke all on function public.search_profiles(text, integer) from public;" },
  @{ Name = "profiles-search-grant"; Query = "grant execute on function public.search_profiles(text, integer) to authenticated;" },
  @{ Name = "games-table"; Query = "create table if not exists public.games (id text primary key, title text not null unique, genre text not null, platform text not null, player_count text not null, description text, is_featured boolean not null default false, created_at timestamptz not null default now());" },
  @{ Name = "games-rls"; Query = "alter table public.games enable row level security;" },
  @{ Name = "games-policy-drop"; Query = "drop policy if exists ""Authenticated users can read games"" on public.games;" },
  @{ Name = "games-policy"; Query = "create policy ""Authenticated users can read games"" on public.games for select to authenticated using (true);" },
  @{ Name = "games-seed-1"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('helix-arena','Helix Arena','Hero Shooter','PC / Console','3-5 players','Fast team-based matches with hero abilities and short queue times.',true) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-2"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('drift-legends-x','Drift Legends X','Racing','PC / Console','2-8 players','Arcade racing nights with custom lobbies and private party queues.',false) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-3"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('deep-raid','Deep Raid','Extraction','PC','2-4 players','High-risk co-op missions with short planning sessions and long-term loot.',true) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-4"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('skyforge-party','Skyforge Party','MMO','Cross-platform','4-6 players','Dungeon runs and weekly guild goals for a repeat squad.',false) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-5"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('pixel-strike-zero','Pixel Strike Zero','Arena Shooter','PC','4-10 players','Retro-styled matches that work well for fast private lobby sessions.',false) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-6"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('wild-rally-online','Wild Rally Online','Racing','Cross-platform','2-12 players','Chaotic off-road playlists with short races and easy drop-in play.',true) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-7"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('void-divers','Void Divers','Co-op Action','PC / Console','2-4 players','Mission-based co-op with rotating objectives and squad builds.',true) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "games-seed-8"; Query = "insert into public.games (id, title, genre, platform, player_count, description, is_featured) values ('castle-circuit','Castle Circuit','Party Strategy','PC / Mobile','2-6 players','Short tactical rounds with low setup cost and high rematch potential.',false) on conflict (id) do update set title = excluded.title, genre = excluded.genre, platform = excluded.platform, player_count = excluded.player_count, description = excluded.description, is_featured = excluded.is_featured;" },
  @{ Name = "social-favorites-table"; Query = "create table if not exists public.favorite_games (profile_id uuid not null references public.profiles(id) on delete cascade, game_id text not null references public.games(id) on delete cascade, created_at timestamptz not null default now(), primary key (profile_id, game_id));" },
  @{ Name = "social-roulette-table"; Query = "create table if not exists public.roulette_pool_entries (profile_id uuid not null references public.profiles(id) on delete cascade, game_id text not null references public.games(id) on delete cascade, created_at timestamptz not null default now(), primary key (profile_id, game_id));" },
  @{ Name = "social-favorites-rls"; Query = "alter table public.favorite_games enable row level security;" },
  @{ Name = "social-roulette-rls"; Query = "alter table public.roulette_pool_entries enable row level security;" },
  @{ Name = "social-favorites-select-drop"; Query = "drop policy if exists ""Users can read their favorite games"" on public.favorite_games;" },
  @{ Name = "social-favorites-select"; Query = "create policy ""Users can read their favorite games"" on public.favorite_games for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "social-favorites-insert-drop"; Query = "drop policy if exists ""Users can insert their favorite games"" on public.favorite_games;" },
  @{ Name = "social-favorites-insert"; Query = "create policy ""Users can insert their favorite games"" on public.favorite_games for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "social-favorites-delete-drop"; Query = "drop policy if exists ""Users can delete their favorite games"" on public.favorite_games;" },
  @{ Name = "social-favorites-delete"; Query = "create policy ""Users can delete their favorite games"" on public.favorite_games for delete to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "social-roulette-select-drop"; Query = "drop policy if exists ""Users can read their roulette pool"" on public.roulette_pool_entries;" },
  @{ Name = "social-roulette-select"; Query = "create policy ""Users can read their roulette pool"" on public.roulette_pool_entries for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "social-roulette-insert-drop"; Query = "drop policy if exists ""Users can insert their roulette pool"" on public.roulette_pool_entries;" },
  @{ Name = "social-roulette-insert"; Query = "create policy ""Users can insert their roulette pool"" on public.roulette_pool_entries for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "social-roulette-delete-drop"; Query = "drop policy if exists ""Users can delete their roulette pool"" on public.roulette_pool_entries;" },
  @{ Name = "social-roulette-delete"; Query = "create policy ""Users can delete their roulette pool"" on public.roulette_pool_entries for delete to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "lobbies-table"; Query = "create table if not exists public.lobbies (id uuid primary key default gen_random_uuid(), host_profile_id uuid not null references public.profiles(id) on delete cascade, game_id text not null references public.games(id) on delete cascade, title text not null, scheduled_for timestamptz, scheduled_until timestamptz, is_private boolean not null default true, status text not null default 'scheduled' check (status in ('scheduled','open','closed')), created_at timestamptz not null default now(), constraint lobbies_scheduled_until_after_start check (scheduled_until is null or scheduled_for is null or scheduled_until > scheduled_for));" },
  @{ Name = "lobbies-add-scheduled-until"; Query = "alter table public.lobbies add column if not exists scheduled_until timestamptz;" },
  @{ Name = "lobbies-drop-constraint"; Query = "alter table public.lobbies drop constraint if exists lobbies_scheduled_until_after_start;" },
  @{ Name = "lobbies-add-constraint"; Query = "alter table public.lobbies add constraint lobbies_scheduled_until_after_start check (scheduled_until is null or scheduled_for is null or scheduled_until > scheduled_for);" },
  @{ Name = "lobby-members-table"; Query = "create table if not exists public.lobby_members (lobby_id uuid not null references public.lobbies(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade, role text not null default 'member' check (role in ('host','member')), rsvp_status text not null default 'pending' check (rsvp_status in ('accepted','pending','declined')), created_at timestamptz not null default now(), primary key (lobby_id, profile_id));" },
  @{ Name = "lobbies-rls"; Query = "alter table public.lobbies enable row level security;" },
  @{ Name = "lobby-members-rls"; Query = "alter table public.lobby_members enable row level security;" },
  @{ Name = "lobbies-select-drop"; Query = "drop policy if exists ""Users can read joined or hosted lobbies"" on public.lobbies;" },
  @{ Name = "lobbies-select"; Query = "create policy ""Users can read joined or hosted lobbies"" on public.lobbies for select to authenticated using (auth.uid() = host_profile_id);" },
  @{ Name = "lobbies-insert-drop"; Query = "drop policy if exists ""Users can create hosted lobbies"" on public.lobbies;" },
  @{ Name = "lobbies-insert"; Query = "create policy ""Users can create hosted lobbies"" on public.lobbies for insert to authenticated with check (auth.uid() = host_profile_id);" },
  @{ Name = "lobbies-update-drop"; Query = "drop policy if exists ""Hosts can update their lobbies"" on public.lobbies;" },
  @{ Name = "lobbies-update"; Query = "create policy ""Hosts can update their lobbies"" on public.lobbies for update to authenticated using (auth.uid() = host_profile_id) with check (auth.uid() = host_profile_id);" },
  @{ Name = "lobby-members-select-drop"; Query = "drop policy if exists ""Users can read memberships for their lobbies"" on public.lobby_members;" },
  @{ Name = "lobby-members-select"; Query = "create policy ""Users can read memberships for their lobbies"" on public.lobby_members for select to authenticated using (auth.uid() = profile_id or exists (select 1 from public.lobbies where lobbies.id = lobby_members.lobby_id and lobbies.host_profile_id = auth.uid()));" },
  @{ Name = "lobby-members-insert-drop"; Query = "drop policy if exists ""Users can join their own membership rows"" on public.lobby_members;" },
  @{ Name = "lobby-members-insert"; Query = "create policy ""Users can join their own membership rows"" on public.lobby_members for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "availability-settings-table"; Query = "create table if not exists public.availability_settings (profile_id uuid primary key references public.profiles(id) on delete cascade, auto_decline_outside_hours boolean not null default false, updated_at timestamptz not null default now());" },
  @{ Name = "availability-slots-table"; Query = "create table if not exists public.availability_slots (profile_id uuid not null references public.profiles(id) on delete cascade, day_key text not null, slot_label text not null, created_at timestamptz not null default now(), primary key (profile_id, day_key, slot_label));" },
  @{ Name = "availability-windows-table"; Query = "create table if not exists public.availability_windows (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade, day_key text not null check (day_key in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')), starts_at time not null, ends_at time not null, created_at timestamptz not null default now(), constraint availability_windows_end_after_start check (ends_at > starts_at));" },
  @{ Name = "availability-settings-rls"; Query = "alter table public.availability_settings enable row level security;" },
  @{ Name = "availability-slots-rls"; Query = "alter table public.availability_slots enable row level security;" },
  @{ Name = "availability-windows-rls"; Query = "alter table public.availability_windows enable row level security;" },
  @{ Name = "availability-settings-select-drop"; Query = "drop policy if exists ""Users can read their availability settings"" on public.availability_settings;" },
  @{ Name = "availability-settings-select"; Query = "create policy ""Users can read their availability settings"" on public.availability_settings for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "availability-settings-insert-drop"; Query = "drop policy if exists ""Users can upsert their availability settings"" on public.availability_settings;" },
  @{ Name = "availability-settings-insert"; Query = "create policy ""Users can upsert their availability settings"" on public.availability_settings for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "availability-settings-update-drop"; Query = "drop policy if exists ""Users can update their availability settings"" on public.availability_settings;" },
  @{ Name = "availability-settings-update"; Query = "create policy ""Users can update their availability settings"" on public.availability_settings for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);" },
  @{ Name = "availability-slots-select-drop"; Query = "drop policy if exists ""Users can read their availability slots"" on public.availability_slots;" },
  @{ Name = "availability-slots-select"; Query = "create policy ""Users can read their availability slots"" on public.availability_slots for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "availability-slots-insert-drop"; Query = "drop policy if exists ""Users can insert their availability slots"" on public.availability_slots;" },
  @{ Name = "availability-slots-insert"; Query = "create policy ""Users can insert their availability slots"" on public.availability_slots for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "availability-slots-delete-drop"; Query = "drop policy if exists ""Users can delete their availability slots"" on public.availability_slots;" },
  @{ Name = "availability-slots-delete"; Query = "create policy ""Users can delete their availability slots"" on public.availability_slots for delete to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "availability-windows-select-drop"; Query = "drop policy if exists ""Users can read their availability windows"" on public.availability_windows;" },
  @{ Name = "availability-windows-select"; Query = "create policy ""Users can read their availability windows"" on public.availability_windows for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "availability-windows-insert-drop"; Query = "drop policy if exists ""Users can insert their availability windows"" on public.availability_windows;" },
  @{ Name = "availability-windows-insert"; Query = "create policy ""Users can insert their availability windows"" on public.availability_windows for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "availability-windows-update-drop"; Query = "drop policy if exists ""Users can update their availability windows"" on public.availability_windows;" },
  @{ Name = "availability-windows-update"; Query = "create policy ""Users can update their availability windows"" on public.availability_windows for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);" },
  @{ Name = "availability-windows-delete-drop"; Query = "drop policy if exists ""Users can delete their availability windows"" on public.availability_windows;" },
  @{ Name = "availability-windows-delete"; Query = "create policy ""Users can delete their availability windows"" on public.availability_windows for delete to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "friend-requests-table"; Query = "create table if not exists public.friend_requests (id uuid primary key default gen_random_uuid(), requester_profile_id uuid not null references public.profiles(id) on delete cascade, addressee_profile_id uuid not null references public.profiles(id) on delete cascade, status text not null default 'pending' check (status in ('pending','accepted','declined','canceled')), created_at timestamptz not null default now(), unique (requester_profile_id, addressee_profile_id), check (requester_profile_id <> addressee_profile_id));" },
  @{ Name = "friends-table"; Query = "create table if not exists public.friends (profile_id uuid not null references public.profiles(id) on delete cascade, friend_profile_id uuid not null references public.profiles(id) on delete cascade, is_favorite boolean not null default false, created_at timestamptz not null default now(), primary key (profile_id, friend_profile_id), check (profile_id <> friend_profile_id));" },
  @{ Name = "friend-requests-rls"; Query = "alter table public.friend_requests enable row level security;" },
  @{ Name = "friends-rls"; Query = "alter table public.friends enable row level security;" },
  @{ Name = "profiles-auth-read-drop"; Query = "drop policy if exists ""Authenticated users can read all profiles"" on public.profiles;" },
  @{ Name = "profiles-auth-read"; Query = "create policy ""Authenticated users can read all profiles"" on public.profiles for select to authenticated using (true);" },
  @{ Name = "friend-requests-select-drop"; Query = "drop policy if exists ""Users can read their friend requests"" on public.friend_requests;" },
  @{ Name = "friend-requests-select"; Query = "create policy ""Users can read their friend requests"" on public.friend_requests for select to authenticated using (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id);" },
  @{ Name = "friend-requests-insert-drop"; Query = "drop policy if exists ""Users can send friend requests"" on public.friend_requests;" },
  @{ Name = "friend-requests-insert"; Query = "create policy ""Users can send friend requests"" on public.friend_requests for insert to authenticated with check (auth.uid() = requester_profile_id);" },
  @{ Name = "friend-requests-update-drop"; Query = "drop policy if exists ""Participants can update their friend requests"" on public.friend_requests;" },
  @{ Name = "friend-requests-update"; Query = "create policy ""Participants can update their friend requests"" on public.friend_requests for update to authenticated using (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id) with check (auth.uid() = requester_profile_id or auth.uid() = addressee_profile_id);" },
  @{ Name = "friends-select-drop"; Query = "drop policy if exists ""Users can read their friends"" on public.friends;" },
  @{ Name = "friends-select"; Query = "create policy ""Users can read their friends"" on public.friends for select to authenticated using (auth.uid() = profile_id);" },
  @{ Name = "friends-insert-drop"; Query = "drop policy if exists ""Users can add their own friendship rows"" on public.friends;" },
  @{ Name = "friends-insert"; Query = "create policy ""Users can add their own friendship rows"" on public.friends for insert to authenticated with check (auth.uid() = profile_id);" },
  @{ Name = "friends-update-drop"; Query = "drop policy if exists ""Users can update their own friendship rows"" on public.friends;" },
  @{ Name = "friends-update"; Query = "create policy ""Users can update their own friendship rows"" on public.friends for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);" },
  @{ Name = "friends-delete-drop"; Query = "drop policy if exists ""Participants can delete friendship rows"" on public.friends;" },
  @{ Name = "friends-delete"; Query = "create policy ""Participants can delete friendship rows"" on public.friends for delete to authenticated using (auth.uid() = profile_id or auth.uid() = friend_profile_id);" },
  @{ Name = "accept-friend-function"; Query = 'create or replace function public.accept_friend_request(p_request_id uuid) returns void language plpgsql security definer set search_path = public as $$ declare request_row public.friend_requests%rowtype; begin select * into request_row from public.friend_requests where id = p_request_id; if not found then raise exception ''Friend request not found''; end if; if request_row.status <> ''pending'' then raise exception ''Friend request is not pending''; end if; if auth.uid() <> request_row.addressee_profile_id then raise exception ''Only the addressee can accept this request''; end if; update public.friend_requests set status = ''accepted'' where id = p_request_id; insert into public.friends (profile_id, friend_profile_id, is_favorite) values (request_row.requester_profile_id, request_row.addressee_profile_id, false), (request_row.addressee_profile_id, request_row.requester_profile_id, false) on conflict (profile_id, friend_profile_id) do nothing; end; $$;' },
  @{ Name = "accept-friend-revoke"; Query = "revoke all on function public.accept_friend_request(uuid) from public;" },
  @{ Name = "accept-friend-grant"; Query = "grant execute on function public.accept_friend_request(uuid) to authenticated;" },
  @{ Name = "communities-table"; Query = "create table if not exists public.communities (id uuid primary key default gen_random_uuid(), name text not null, invite_code text not null unique, discord_guild_id text, created_by_profile_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now());" },
  @{ Name = "community-members-table"; Query = "create table if not exists public.community_members (community_id uuid not null references public.communities(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade, role text not null default 'member' check (role in ('owner','member')), created_at timestamptz not null default now(), primary key (community_id, profile_id));" },
  @{ Name = "profiles-primary-community"; Query = "alter table public.profiles add column if not exists primary_community_id uuid references public.communities(id) on delete set null;" },
  @{ Name = "communities-rls"; Query = "alter table public.communities enable row level security;" },
  @{ Name = "community-members-rls"; Query = "alter table public.community_members enable row level security;" },
  @{ Name = "communities-select-drop"; Query = "drop policy if exists ""Users can read their communities"" on public.communities;" },
  @{ Name = "communities-select"; Query = "create policy ""Users can read their communities"" on public.communities for select to authenticated using (id = (select primary_community_id from public.profiles where id = auth.uid()));" },
  @{ Name = "community-members-select-drop"; Query = "drop policy if exists ""Users can read members in their communities"" on public.community_members;" },
  @{ Name = "community-members-select"; Query = "create policy ""Users can read members in their communities"" on public.community_members for select to authenticated using (community_id = (select primary_community_id from public.profiles where id = auth.uid()));" },
  @{ Name = "community-code-function"; Query = 'create or replace function public.generate_community_invite_code() returns text language plpgsql as $$ declare next_code text; begin loop next_code := substring(replace(gen_random_uuid()::text, ''-'', '''') from 1 for 8); exit when not exists (select 1 from public.communities where invite_code = next_code); end loop; return next_code; end; $$;' },
  @{ Name = "community-create-function"; Query = 'create or replace function public.create_community(p_name text) returns public.communities language plpgsql security definer set search_path = public as $$ declare created_community public.communities; begin if auth.uid() is null then raise exception ''Authentication required''; end if; if trim(coalesce(p_name, '''')) = '''' then raise exception ''Community name is required''; end if; insert into public.communities (name, invite_code, created_by_profile_id) values (trim(p_name), public.generate_community_invite_code(), auth.uid()) returning * into created_community; insert into public.community_members (community_id, profile_id, role) values (created_community.id, auth.uid(), ''owner'') on conflict (community_id, profile_id) do update set role = excluded.role; update public.profiles set primary_community_id = created_community.id where id = auth.uid(); return created_community; end; $$;' },
  @{ Name = "community-join-function"; Query = 'create or replace function public.join_community_by_invite(p_invite_code text) returns public.communities language plpgsql security definer set search_path = public as $$ declare matched_community public.communities; begin if auth.uid() is null then raise exception ''Authentication required''; end if; select * into matched_community from public.communities where lower(invite_code) = lower(trim(coalesce(p_invite_code, ''''))); if not found then raise exception ''Invite code not found''; end if; insert into public.community_members (community_id, profile_id, role) values (matched_community.id, auth.uid(), ''member'') on conflict (community_id, profile_id) do nothing; update public.profiles set primary_community_id = matched_community.id where id = auth.uid(); return matched_community; end; $$;' },
  @{ Name = "community-code-revoke"; Query = "revoke all on function public.generate_community_invite_code() from public;" },
  @{ Name = "community-code-grant"; Query = "grant execute on function public.generate_community_invite_code() to authenticated;" },
  @{ Name = "community-create-revoke"; Query = "revoke all on function public.create_community(text) from public;" },
  @{ Name = "community-create-grant"; Query = "grant execute on function public.create_community(text) to authenticated;" },
  @{ Name = "community-join-revoke"; Query = "revoke all on function public.join_community_by_invite(text) from public;" },
  @{ Name = "community-join-grant"; Query = "grant execute on function public.join_community_by_invite(text) to authenticated;" },
  @{ Name = "discord-columns"; Query = "alter table public.profiles add column if not exists discord_user_id text, add column if not exists discord_username text, add column if not exists discord_avatar_url text, add column if not exists discord_connected_at timestamptz;" },
  @{ Name = "discord-index"; Query = "create unique index if not exists profiles_discord_user_id_key on public.profiles (discord_user_id) where discord_user_id is not null;" }
)

foreach ($query in $queries) {
  Invoke-SupabaseQuery -Name $query.Name -Query $query.Query
}
