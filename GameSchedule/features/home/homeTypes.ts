export type SectionKey =
  | 'dashboard'
  | 'friends'
  | 'games'
  | 'roulette'
  | 'lobbies'
  | 'schedule'
  | 'inbox'
  | 'profile';

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  onboarding_complete: boolean;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_visibility: 'private' | 'public';
  primary_community_id: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  discord_connected_at: string | null;
};

export type DiscordGuildRecord = {
  profile_id: string;
  discord_guild_id: string;
  name: string;
  icon_url: string | null;
  is_owner: boolean;
  synced_at: string;
};

export type CommunityRecord = {
  id: string;
  name: string;
  invite_code: string;
  discord_guild_id: string | null;
  created_by_profile_id: string;
  created_at: string;
};

export type CommunityMemberRecord = {
  community_id: string;
  profile_id: string;
  role: 'owner' | 'member';
  created_at: string;
};

export type SuggestedFriendRecord = Profile & {
  community_role: 'owner' | 'member';
};

export type GameRecord = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string | null;
  is_featured: boolean;
  igdb_id?: number | null;
  cover_url?: string | null;
  release_date?: string | null;
  rating?: number | null;
  source?: 'seed' | 'igdb';
};

export type IgdbSearchResult = {
  igdb_id: number;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string | null;
  cover_url: string | null;
  release_date: string | null;
  rating: number | null;
  source: 'igdb';
};

export type RouletteEntry = {
  game_id: string;
  games: Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'> | null;
};

export type LobbyRecord = {
  id: string;
  title: string;
  scheduled_for: string | null;
  scheduled_until: string | null;
  discord_guild_id: string | null;
  discord_guild_name: string | null;
  discord_guild_icon_url: string | null;
  is_private: boolean;
  status: 'scheduled' | 'open' | 'closed';
  game_id: string;
  host_profile_id: string;
  games: Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform' | 'player_count'> | null;
  invite_count?: number;
};

export type LobbyInviteStatus = 'accepted' | 'pending' | 'declined' | 'suggested_time';

export type LobbyMemberRole = 'host' | 'member';

export type LobbyMemberRecord = {
  lobby_id: string;
  profile_id: string;
  role: LobbyMemberRole;
  rsvp_status: LobbyInviteStatus;
  response_comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  responded_at: string | null;
  invited_at: string;
  created_at: string;
};

export type LobbyInviteHistoryRecord = {
  id: string;
  lobby_id: string;
  profile_id: string;
  actor_profile_id: string;
  rsvp_status: LobbyInviteStatus;
  comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  origin: 'member' | 'host_apply';
  created_at: string;
};

export type AvailabilitySetting = {
  profile_id: string;
  auto_decline_outside_hours: boolean;
};

export type AvailabilityWindow = {
  id?: string;
  profile_id: string;
  day_key: string;
  starts_at: string;
  ends_at: string;
  created_at?: string;
};

export type RelatedGameSummary = Pick<GameRecord, 'id' | 'title' | 'genre' | 'platform'>;

export type RelatedLobbyGameSummary = Pick<
  GameRecord,
  'id' | 'title' | 'genre' | 'platform' | 'player_count'
>;

export type FriendshipRecord = {
  profile_id: string;
  friend_profile_id: string;
  is_favorite: boolean;
};

export type FriendRequestRecord = {
  id: string;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
};
