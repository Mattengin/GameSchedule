import type { GameRecord, SectionKey } from './homeTypes';

export const fallbackInviteFriends = [
  { name: 'NovaHex', status: 'Online', note: 'Ready for co-op in 20m', favorite: true },
  { name: 'PixelMoth', status: 'In lobby', note: 'Queued for two rounds', favorite: true },
  { name: 'EchoVale', status: 'Offline', note: 'Last online 2h ago', favorite: false },
  { name: 'LumaByte', status: 'Pending', note: 'Sent friend code yesterday', favorite: false },
];

export const fallbackGames: GameRecord[] = [
  {
    id: 'helix-arena',
    title: 'Helix Arena',
    genre: 'Hero Shooter',
    platform: 'PC / Console',
    player_count: '3-5 players',
    description: 'Fast team-based matches with hero abilities and short queue times.',
    is_featured: true,
  },
  {
    id: 'drift-legends-x',
    title: 'Drift Legends X',
    genre: 'Racing',
    platform: 'PC / Console',
    player_count: '2-8 players',
    description: 'Arcade racing nights with custom lobbies and private party queues.',
    is_featured: false,
  },
  {
    id: 'deep-raid',
    title: 'Deep Raid',
    genre: 'Extraction',
    platform: 'PC',
    player_count: '2-4 players',
    description: 'High-risk co-op missions with short planning sessions and long-term loot.',
    is_featured: true,
  },
  {
    id: 'skyforge-party',
    title: 'Skyforge Party',
    genre: 'MMO',
    platform: 'Cross-platform',
    player_count: '4-6 players',
    description: 'Dungeon runs and weekly guild goals for a repeat squad.',
    is_featured: false,
  },
];

export const notifications = [
  { label: 'Invite', message: 'NovaHex invited you to a Helix Arena lobby.', age: '2m ago' },
  { label: 'Reminder', message: 'Deep Raid Warmup starts in 1 hour.', age: '58m ago' },
  { label: 'System', message: 'Discord sync is ready when you decide to connect it.', age: 'Today' },
];

export const availabilityDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const sections: { value: SectionKey; label: string }[] = [
  { value: 'dashboard', label: 'Home' },
  { value: 'friends', label: 'Friends' },
  { value: 'games', label: 'Games' },
  { value: 'roulette', label: 'Roulette' },
  { value: 'lobbies', label: 'Lobbies' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'profile', label: 'Profile' },
];

export const allowSignup = process.env.EXPO_PUBLIC_ALLOW_SIGNUP !== 'false';
export const demoLabel = process.env.EXPO_PUBLIC_DEMO_LABEL?.trim() ?? '';
export const discordClientId = process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID?.trim() ?? '';
export const discordStateStorageKey = 'gameschedule-discord-oauth-state';
export const profileSelectFields =
  'id, username, avatar_url, display_name, onboarding_complete, birthday_month, birthday_day, birthday_visibility, primary_community_id, discord_user_id, discord_username, discord_avatar_url, discord_connected_at';
