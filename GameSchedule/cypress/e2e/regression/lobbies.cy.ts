type MockGame = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string;
  is_featured: boolean;
  igdb_id?: number | null;
  cover_url?: string | null;
  release_date?: string | null;
  rating?: number | null;
  source?: 'seed' | 'igdb';
};

type MockIgdbGame = {
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

type MockProfile = {
  id: string;
  username: string;
  friend_code: string;
  avatar_url: string | null;
  display_name: string;
  onboarding_complete: boolean;
  birthday_month?: number | null;
  birthday_day?: number | null;
  birthday_visibility?: 'private' | 'public';
  busy_visibility?: 'private' | 'public';
  primary_community_id: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  discord_connected_at: string | null;
};

type MockAccount = {
  email: string;
  password: string;
  userId: string;
  profile: MockProfile;
};

type MockLobby = {
  id: string;
  title: string;
  scheduled_for: string | null;
  scheduled_until: string | null;
  meetup_details: string | null;
  discord_guild_id: string | null;
  discord_guild_name: string | null;
  discord_guild_icon_url: string | null;
  is_private: boolean;
  status: 'scheduled' | 'open' | 'closed';
  game_id: string;
  host_profile_id: string;
  games: {
    id: string;
    title: string;
    genre: string;
    platform: string;
    player_count: string;
  } | null;
  created_at: string;
};

type MockLobbyMember = {
  lobby_id: string;
  profile_id: string;
  role: 'host' | 'member';
  rsvp_status: 'accepted' | 'pending' | 'declined' | 'suggested_time';
  response_comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  responded_at: string | null;
  invited_at: string;
  created_at: string;
};

type MockLobbyHistory = {
  id: string;
  lobby_id: string;
  profile_id: string;
  actor_profile_id: string;
  rsvp_status: 'accepted' | 'pending' | 'declined' | 'suggested_time';
  comment: string | null;
  suggested_start_at: string | null;
  suggested_end_at: string | null;
  origin: 'member' | 'host_apply';
  created_at: string;
};

type MockFriendship = {
  profile_id: string;
  friend_profile_id: string;
  is_favorite: boolean;
};

type MockDiscordGuild = {
  profile_id: string;
  discord_guild_id: string;
  name: string;
  icon_url: string | null;
  is_owner: boolean;
  synced_at: string;
};

type MockPublicProfileCard = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  birthday_label: string | null;
  is_discord_connected: boolean;
};

const seedGames: MockGame[] = [
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
    id: 'deep-raid',
    title: 'Deep Raid',
    genre: 'Extraction',
    platform: 'PC',
    player_count: '2-4 players',
    description: 'High-risk co-op missions with short planning sessions and long-term loot.',
    is_featured: true,
  },
  {
    id: 'wild-rally-online',
    title: 'Wild Rally Online',
    genre: 'Racing',
    platform: 'Cross-platform',
    player_count: '2-12 players',
    description: 'Chaotic off-road playlists with short races and easy drop-in play.',
    is_featured: true,
  },
];

const games: MockGame[] = seedGames.map((game) => ({ ...game }));

const igdbResultsByQuery: Record<string, MockIgdbGame[]> = {
  portal: [
    {
      igdb_id: 1234,
      title: 'Portal 2',
      genre: 'Puzzle / Platform',
      platform: 'PC / PlayStation / Xbox',
      player_count: '2+ players',
      description: 'Solve co-op puzzles with portals, timing, and a very patient robot voice.',
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs7.jpg',
      release_date: '2011-04-19',
      rating: 95,
      source: 'igdb',
    },
  ],
};

const authStore = new Map<string, MockAccount>();
const lobbyStore: MockLobby[] = [];
const lobbyMembersStore: MockLobbyMember[] = [];
const lobbyHistoryStore: MockLobbyHistory[] = [];
const friendshipStore: MockFriendship[] = [];
const profileDiscordGuildStore: MockDiscordGuild[] = [];
const profileGamesStore = new Map<string, string[]>();

let currentSessionUserId: string | null = null;
let lobbySequence = 0;
let historySequence = 0;
let timestampSequence = 0;

const friendPassword = 'InvitePass123!';
const hostEmail = `cypress-lobbies-${Date.now()}@example.com`;
const hostPassword = `Password123!${Date.now()}`;
const novaEmail = 'nova.hex@example.com';
const pixelEmail = 'pixel.moth@example.com';
const friendCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const makeFriendCode = (seed: string) => {
  const normalizedSeed = seed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
    .filter((character) => friendCodeAlphabet.includes(character))
    .join('')
    .padEnd(8, 'X');

  return `GS-${normalizedSeed.slice(0, 4)}-${normalizedSeed.slice(4, 8)}`;
};

const nextIsoTimestamp = () => {
  timestampSequence += 1;
  return new Date(Date.now() + timestampSequence * 1000).toISOString();
};

const createEveningWindow = (durationHours = 2) => {
  const startAt = new Date();
  startAt.setHours(20, 0, 0, 0);

  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + durationHours);

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  };
};

const makeAccount = (
  email: string,
  password: string,
  options?: {
    displayName?: string;
    username?: string;
  },
): MockAccount => {
  const userId = makeUserId(email);
  const username = options?.username ?? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '');

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username,
      friend_code: makeFriendCode(username),
      avatar_url: null,
      display_name: options?.displayName ?? username,
      onboarding_complete: true,
      birthday_month: null,
      birthday_day: null,
      birthday_visibility: 'private',
      busy_visibility: 'public',
      primary_community_id: null,
      discord_user_id: null,
      discord_username: null,
      discord_avatar_url: null,
      discord_connected_at: null,
    },
  };
};

const makeAuthBody = (account: MockAccount) => {
  const now = nextIsoTimestamp();

  return {
    access_token: `access-token-${account.userId}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-token-${account.userId}`,
    user: {
      id: account.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: account.email,
      email_confirmed_at: now,
      phone: '',
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
    },
  };
};

const formatBirthdayLabel = (month: number | null | undefined, day: number | null | undefined) => {
  if (!month || !day) {
    return null;
  }

  const date = new Date(2000, month - 1, day);
  return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}`;
};

const toPublicProfileCard = (profile: MockProfile): MockPublicProfileCard => ({
  id: profile.id,
  username: profile.username ?? null,
  avatar_url: profile.avatar_url ?? profile.discord_avatar_url ?? null,
  display_name: profile.display_name ?? null,
  birthday_label:
    profile.birthday_visibility === 'public'
      ? formatBirthdayLabel(profile.birthday_month, profile.birthday_day)
      : null,
  is_discord_connected: Boolean(profile.discord_user_id),
});

const makeImportedGameRecord = (game: MockIgdbGame): MockGame => ({
  id: `igdb-${game.igdb_id}`,
  title: game.title,
  genre: game.genre,
  platform: game.platform,
  player_count: game.player_count,
  description: game.description ?? '',
  is_featured: false,
  igdb_id: game.igdb_id,
  cover_url: game.cover_url,
  release_date: game.release_date,
  rating: game.rating,
  source: 'igdb',
});

const getQueryValue = (url: string, key: string) => {
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=eq\\.([^&]+)`).exec(decodedUrl);
  return match ? decodeURIComponent(match[1]) : '';
};

const getQueryValues = (url: string, key: string) => {
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=in\\.\\(([^)]+)\\)`).exec(decodedUrl);

  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const assertNoHorizontalOverflow = () => {
  cy.window().then((win) => {
    const viewportWidth = win.innerWidth;

    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth, 'page should not overflow horizontally').to.be.lte(
        viewportWidth + 1,
      );
    });
  });
};

const getAccountById = (profileId: string) => authStore.get(profileId) ?? null;

const setOwnedGames = (userId: string, gameIds: string[]) => {
  profileGamesStore.set(
    userId,
    gameIds.filter((gameId, index, values) => values.indexOf(gameId) === index),
  );
};

const addOwnedGame = (userId: string, gameId: string) => {
  const current = profileGamesStore.get(userId) ?? [];
  profileGamesStore.set(userId, current.includes(gameId) ? current : [...current, gameId]);
};

const ensureAccount = (email: string, password: string, options?: { displayName?: string; username?: string }) => {
  const userId = makeUserId(email);
  const existing = authStore.get(userId);
  if (existing) {
    return existing;
  }

  const account = makeAccount(email, password, options);
  authStore.set(account.userId, account);
  return account;
};

const upsertFriendship = (profileId: string, friendProfileId: string, isFavorite: boolean) => {
  const existingIndex = friendshipStore.findIndex(
    (friendship) => friendship.profile_id === profileId && friendship.friend_profile_id === friendProfileId,
  );

  if (existingIndex >= 0) {
    friendshipStore[existingIndex] = {
      ...friendshipStore[existingIndex],
      is_favorite: isFavorite,
    };
    return;
  }

  friendshipStore.push({
    profile_id: profileId,
    friend_profile_id: friendProfileId,
    is_favorite: isFavorite,
  });
};

const replaceDiscordGuildsForProfile = (
  profileId: string,
  guilds: {
    discord_guild_id: string;
    name: string;
    icon_url?: string | null;
    is_owner?: boolean;
  }[],
) => {
  for (let index = profileDiscordGuildStore.length - 1; index >= 0; index -= 1) {
    if (profileDiscordGuildStore[index].profile_id === profileId) {
      profileDiscordGuildStore.splice(index, 1);
    }
  }

  guilds.forEach((guild) => {
    profileDiscordGuildStore.push({
      profile_id: profileId,
      discord_guild_id: guild.discord_guild_id,
      name: guild.name,
      icon_url: guild.icon_url ?? null,
      is_owner: guild.is_owner ?? false,
      synced_at: nextIsoTimestamp(),
    });
  });
};

const ensureInviteGraphForHost = (hostAccount: MockAccount) => {
  const novaAccount = ensureAccount(novaEmail, friendPassword, {
    displayName: 'Nova Hex',
    username: 'novahex',
  });
  const pixelAccount = ensureAccount(pixelEmail, friendPassword, {
    displayName: 'Pixel Moth',
    username: 'pixelmoth',
  });

  upsertFriendship(hostAccount.userId, novaAccount.userId, true);
  upsertFriendship(hostAccount.userId, pixelAccount.userId, false);
  upsertFriendship(novaAccount.userId, hostAccount.userId, false);
  upsertFriendship(pixelAccount.userId, hostAccount.userId, false);

  return {
    novaAccount,
    pixelAccount,
  };
};

const buildLobby = (
  hostAccount: MockAccount,
  gameId: string,
  title: string,
  scheduledFor: string | null,
  scheduledUntil: string | null,
  isPrivate: boolean,
  meetupDetails: string | null = null,
): MockLobby => {
  lobbySequence += 1;
  const game = games.find((item) => item.id === gameId) ?? null;

  return {
    id: `lobby-${lobbySequence}`,
    title,
    scheduled_for: scheduledFor,
    scheduled_until: scheduledUntil,
    meetup_details: meetupDetails,
    discord_guild_id: null,
    discord_guild_name: null,
    discord_guild_icon_url: null,
    is_private: isPrivate,
    status: 'scheduled',
    game_id: gameId,
    host_profile_id: hostAccount.userId,
    games: game
      ? {
          id: game.id,
          title: game.title,
          genre: game.genre,
          platform: game.platform,
          player_count: game.player_count,
        }
      : null,
    created_at: nextIsoTimestamp(),
  };
};

const appendHistory = (
  lobbyId: string,
  profileId: string,
  actorProfileId: string,
  status: MockLobbyHistory['rsvp_status'],
  comment: string | null,
  suggestedStartAt: string | null,
  suggestedEndAt: string | null,
  origin: MockLobbyHistory['origin'],
) => {
  historySequence += 1;
  lobbyHistoryStore.unshift({
    id: `history-${historySequence}`,
    lobby_id: lobbyId,
    profile_id: profileId,
    actor_profile_id: actorProfileId,
    rsvp_status: status,
    comment,
    suggested_start_at: suggestedStartAt,
    suggested_end_at: suggestedEndAt,
    origin,
    created_at: nextIsoTimestamp(),
  });
};

const getAccessibleLobbyIds = (profileId: string) =>
  lobbyStore
    .filter(
      (lobby) =>
        lobby.host_profile_id === profileId ||
        lobbyMembersStore.some((member) => member.lobby_id === lobby.id && member.profile_id === profileId),
    )
    .map((lobby) => lobby.id);

const getBusyBlockEndIso = (lobby: Pick<MockLobby, 'scheduled_for' | 'scheduled_until'>) => {
  if (lobby.scheduled_until) {
    return lobby.scheduled_until;
  }

  if (!lobby.scheduled_for) {
    return null;
  }

  const fallbackEnd = new Date(lobby.scheduled_for);
  fallbackEnd.setHours(fallbackEnd.getHours() + 2);
  return fallbackEnd.toISOString();
};

const rangesOverlap = (
  firstStartIso: string,
  firstEndIso: string,
  secondStartIso: string,
  secondEndIso: string,
) => new Date(firstStartIso) < new Date(secondEndIso) && new Date(secondStartIso) < new Date(firstEndIso);

const registerMockLobbies = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = ensureAccount(email, password);

    ensureInviteGraphForHost(account);
    profileGamesStore.set(account.userId, profileGamesStore.get(account.userId) ?? games.map((game) => game.id));
    currentSessionUserId = account.userId;

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = ensureAccount(email, password);

    profileGamesStore.set(account.userId, profileGamesStore.get(account.userId) ?? games.map((game) => game.id));
    currentSessionUserId = account.userId;

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signinRequest');

  cy.intercept('POST', '**/auth/v1/logout', (req) => {
    currentSessionUserId = null;
    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('logoutRequest');

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const requestedEqId = getQueryValue(req.url, 'id');
    const requestedIds = getQueryValues(req.url, 'id');

    if (requestedIds.length > 0) {
      req.reply({
        statusCode: 200,
        body: requestedIds
          .map((profileId) => getAccountById(profileId)?.profile ?? null)
          .filter((profile): profile is MockProfile => Boolean(profile)),
      });
      return;
    }

    req.reply({
      statusCode: 200,
      body: getAccountById(requestedEqId)?.profile ?? null,
    });
  }).as('profilesRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_visible_profiles', (req) => {
    const requestedIds = ((req.body as { p_profile_ids?: string[] | null } | null)?.p_profile_ids ?? []).filter(
      Boolean,
    );

    req.reply({
      statusCode: 200,
      body: requestedIds
        .map((profileId) => getAccountById(profileId)?.profile ?? null)
        .filter((profile): profile is MockProfile => Boolean(profile))
        .map(toPublicProfileCard),
    });
  }).as('visibleProfilesRpc');

  cy.intercept('GET', '**/rest/v1/friends*', (req) => {
    req.reply({
      statusCode: 200,
      body: friendshipStore.filter((friendship) => friendship.profile_id === currentSessionUserId),
    });
  }).as('friendsRequest');

  cy.intercept('GET', '**/rest/v1/friend_requests*', {
    statusCode: 200,
    body: [],
  }).as('friendRequestsRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_discord_friend_suggestions', {
    statusCode: 200,
    body: [],
  }).as('discordSuggestionsRpc');

  cy.intercept('POST', '**/rest/v1/rpc/search_discord_profiles', {
    statusCode: 200,
    body: [],
  }).as('searchDiscordProfilesRpc');

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: games,
  }).as('gamesRequest');

  cy.intercept('GET', '**/rest/v1/profile_games*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id') || currentSessionUserId || '';
    const ownedGameIds = profileGamesStore.get(userId) ?? [];

    req.reply({
      statusCode: 200,
      body: ownedGameIds
        .map((gameId) => {
          const game = games.find((item) => item.id === gameId);
          if (!game) {
            return null;
          }

          return {
            profile_id: userId,
            game_id: game.id,
            created_at: nextIsoTimestamp(),
            games: game,
          };
        })
        .filter(Boolean),
    });
  }).as('profileGamesRequest');

  cy.intercept('POST', '**/functions/v1/igdb-search', (req) => {
    const query = ((req.body as { query?: string } | null)?.query ?? '').trim().toLowerCase();

    req.reply({
      statusCode: 200,
      body: {
        results: igdbResultsByQuery[query] ?? [],
      },
    });
  }).as('igdbSearchFunction');

  cy.intercept('POST', '**/functions/v1/igdb-import-game', (req) => {
    const body = (req.body as MockIgdbGame | null) ?? null;

    if (!body?.igdb_id || !currentSessionUserId) {
      req.reply({
        statusCode: 400,
        body: { error: 'Missing game payload' },
      });
      return;
    }

    const importedGame = makeImportedGameRecord(body);
    const existingIndex = games.findIndex((game) => game.id === importedGame.id);

    if (existingIndex >= 0) {
      games.splice(existingIndex, 1, importedGame);
    } else {
      games.push(importedGame);
    }

    addOwnedGame(currentSessionUserId, importedGame.id);

    req.reply({
      statusCode: 200,
      body: {
        game: importedGame,
      },
    });
  }).as('igdbImportFunction');

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('rouletteRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        profile_id: currentSessionUserId,
        auto_decline_outside_hours: false,
      },
    });
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');

  cy.intercept('GET', '**/rest/v1/profile_discord_guilds*', (req) => {
    req.reply({
      statusCode: 200,
      body: profileDiscordGuildStore.filter((guild) => guild.profile_id === currentSessionUserId),
    });
  }).as('profileDiscordGuildsRequest');

  cy.intercept('POST', '**/rest/v1/rpc/replace_discord_guilds', (req) => {
    const guilds = ((req.body as { p_guilds?: MockDiscordGuild[] | Record<string, unknown>[] | null })?.p_guilds ??
      []) as {
      discord_guild_id: string;
      name: string;
      icon_url?: string | null;
      is_owner?: boolean;
    }[];

    if (currentSessionUserId) {
      replaceDiscordGuildsForProfile(currentSessionUserId, guilds);
    }

    req.reply({
      statusCode: 200,
      body: guilds.length,
    });
  }).as('replaceDiscordGuildsRpc');

  cy.intercept('GET', '**/rest/v1/lobbies*', (req) => {
    const accessibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));
    req.reply({
      statusCode: 200,
      body: lobbyStore.filter((lobby) => accessibleLobbyIds.has(lobby.id)),
    });
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/lobby_members*', (req) => {
    const requestedLobbyIds = getQueryValues(req.url, 'lobby_id');
    const visibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));

    req.reply({
      statusCode: 200,
      body: lobbyMembersStore.filter((member) => {
        if (requestedLobbyIds.length > 0 && !requestedLobbyIds.includes(member.lobby_id)) {
          return false;
        }

        const lobby = lobbyStore.find((item) => item.id === member.lobby_id);
        if (!lobby || !visibleLobbyIds.has(member.lobby_id)) {
          return false;
        }

        return lobby.host_profile_id === currentSessionUserId || member.profile_id === currentSessionUserId;
      }),
    });
  }).as('lobbyMembersRequest');

  cy.intercept('GET', '**/rest/v1/lobby_member_response_history*', (req) => {
    const requestedLobbyIds = getQueryValues(req.url, 'lobby_id');
    const visibleLobbyIds = new Set(getAccessibleLobbyIds(currentSessionUserId ?? ''));

    req.reply({
      statusCode: 200,
      body: lobbyHistoryStore.filter((entry) => {
        if (requestedLobbyIds.length > 0 && !requestedLobbyIds.includes(entry.lobby_id)) {
          return false;
        }

        const lobby = lobbyStore.find((item) => item.id === entry.lobby_id);
        if (!lobby || !visibleLobbyIds.has(entry.lobby_id)) {
          return false;
        }

        return lobby.host_profile_id === currentSessionUserId || entry.profile_id === currentSessionUserId;
      }),
    });
  }).as('lobbyHistoryRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_profile_busy_blocks', (req) => {
    const {
      p_profile_ids: profileIds = [],
      p_window_start: windowStart,
      p_window_end: windowEnd,
    } = req.body as {
      p_profile_ids?: string[];
      p_window_start: string;
      p_window_end: string;
    };

    const body = profileIds.flatMap((profileId) => {
      const account = getAccountById(profileId);
      const visibility = account?.profile.busy_visibility ?? 'public';

      return lobbyStore
        .filter((lobby) => {
          if (lobby.status === 'closed' || !lobby.scheduled_for) {
            return false;
          }

          const busyEndIso = getBusyBlockEndIso(lobby);
          if (!busyEndIso) {
            return false;
          }

          const isHost = lobby.host_profile_id === profileId;
          const isAcceptedMember = lobbyMembersStore.some(
            (member) =>
              member.lobby_id === lobby.id &&
              member.profile_id === profileId &&
              member.role === 'member' &&
              member.rsvp_status === 'accepted',
          );

          return (
            (isHost || isAcceptedMember) &&
            rangesOverlap(lobby.scheduled_for, busyEndIso, windowStart, windowEnd)
          );
        })
        .map((lobby) => ({
          profile_id: profileId,
          lobby_id: lobby.id,
          starts_at: lobby.scheduled_for,
          ends_at: getBusyBlockEndIso(lobby),
          busy_status: lobby.scheduled_until ? 'busy' : 'maybe_busy',
          game_title: visibility === 'public' ? lobby.games?.title ?? null : null,
        }));
    });

    req.reply({
      statusCode: 200,
      body,
    });
  }).as('busyBlocksRpc');

  cy.intercept('POST', '**/rest/v1/rpc/create_lobby_with_invites', (req) => {
    const currentAccount = getAccountById(currentSessionUserId ?? '');
    if (!currentAccount) {
      req.reply({
        statusCode: 401,
        body: { message: 'Missing authenticated user' },
      });
      return;
    }

    const {
      p_game_id: gameId,
      p_title: title,
      p_scheduled_for: scheduledFor,
      p_scheduled_until: scheduledUntil,
      p_is_private: isPrivate,
      p_invited_profile_ids: invitedProfileIds = [],
      p_meetup_details: meetupDetails = null,
    } = req.body as {
      p_game_id: string;
      p_title: string;
      p_scheduled_for: string | null;
      p_scheduled_until: string | null;
      p_is_private: boolean;
      p_invited_profile_ids?: string[];
      p_meetup_details?: string | null;
    };

    const lobby = buildLobby(currentAccount, gameId, title, scheduledFor, scheduledUntil, isPrivate, meetupDetails);
    lobbyStore.unshift(lobby);

    lobbyMembersStore.push({
      lobby_id: lobby.id,
      profile_id: currentAccount.userId,
      role: 'host',
      rsvp_status: 'accepted',
      response_comment: null,
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
      invited_at: nextIsoTimestamp(),
      created_at: nextIsoTimestamp(),
    });

    invitedProfileIds.forEach((profileId) => {
      lobbyMembersStore.push({
        lobby_id: lobby.id,
        profile_id: profileId,
        role: 'member',
        rsvp_status: 'pending',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: null,
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      });
    });

    req.reply({
      statusCode: 200,
      body: lobby,
    });
  }).as('createLobbyRpc');

  cy.intercept('POST', '**/rest/v1/rpc/respond_to_lobby_invite', (req) => {
    const {
      p_lobby_id: lobbyId,
      p_status: status,
      p_comment: comment,
      p_suggested_start_at: suggestedStartAt,
      p_suggested_end_at: suggestedEndAt,
    } = req.body as {
      p_lobby_id: string;
      p_status: MockLobbyMember['rsvp_status'];
      p_comment: string | null;
      p_suggested_start_at: string | null;
      p_suggested_end_at: string | null;
    };

    const memberIndex = lobbyMembersStore.findIndex(
      (member) => member.lobby_id === lobbyId && member.profile_id === currentSessionUserId,
    );

    if (memberIndex < 0 || !currentSessionUserId) {
      req.reply({
        statusCode: 404,
        body: { message: 'Lobby member not found' },
      });
      return;
    }

    const lobby = lobbyStore.find((item) => item.id === lobbyId) ?? null;
    const currentMember = lobbyMembersStore[memberIndex];
    let nextSuggestedStartAt = status === 'suggested_time' ? suggestedStartAt : null;
    let nextSuggestedEndAt = status === 'suggested_time' ? suggestedEndAt : null;

    if (status === 'suggested_time' && lobby?.scheduled_for && lobby?.scheduled_until) {
      const lobbyStartAt = new Date(lobby.scheduled_for);
      const lobbyEndAt = new Date(lobby.scheduled_until);
      const nextStartAt = new Date(lobbyStartAt);
      const nextEndAt = new Date(lobbyEndAt);

      nextStartAt.setHours(nextStartAt.getHours() + 2);
      nextEndAt.setHours(nextEndAt.getHours() + 2);

      nextSuggestedStartAt = nextStartAt.toISOString();
      nextSuggestedEndAt = nextEndAt.toISOString();
    }

    const nextMember: MockLobbyMember = {
      ...currentMember,
      rsvp_status: status,
      response_comment: comment,
      suggested_start_at: nextSuggestedStartAt,
      suggested_end_at: nextSuggestedEndAt,
      responded_at: nextIsoTimestamp(),
    };

    lobbyMembersStore[memberIndex] = nextMember;
    appendHistory(
      lobbyId,
      currentSessionUserId,
      currentSessionUserId,
      status,
      comment,
      nextSuggestedStartAt,
      nextSuggestedEndAt,
      'member',
    );

    req.reply({
      statusCode: 200,
      body: nextMember,
    });
  }).as('respondToInviteRpc');

  cy.intercept('POST', '**/rest/v1/rpc/apply_lobby_time_suggestion', (req) => {
    const {
      p_lobby_id: lobbyId,
      p_profile_id: profileId,
    } = req.body as {
      p_lobby_id: string;
      p_profile_id: string;
    };

    const lobbyIndex = lobbyStore.findIndex((lobby) => lobby.id === lobbyId);
    const suggestedMemberIndex = lobbyMembersStore.findIndex(
      (member) => member.lobby_id === lobbyId && member.profile_id === profileId,
    );

    if (lobbyIndex < 0 || suggestedMemberIndex < 0 || !currentSessionUserId) {
      req.reply({
        statusCode: 404,
        body: { message: 'Suggestion not found' },
      });
      return;
    }

    const suggestedMember = lobbyMembersStore[suggestedMemberIndex];
    const lobby = lobbyStore[lobbyIndex];

    lobbyStore[lobbyIndex] = {
      ...lobby,
      scheduled_for: suggestedMember.suggested_start_at,
      scheduled_until: suggestedMember.suggested_end_at,
    };

    lobbyMembersStore[suggestedMemberIndex] = {
      ...suggestedMember,
      rsvp_status: 'accepted',
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
    };

    appendHistory(
      lobbyId,
      profileId,
      currentSessionUserId,
      'accepted',
      'Suggested time applied by host.',
      lobbyStore[lobbyIndex].scheduled_for,
      lobbyStore[lobbyIndex].scheduled_until,
      'host_apply',
    );

    lobbyMembersStore.forEach((member, index) => {
      if (member.lobby_id !== lobbyId || member.role !== 'member' || member.profile_id === profileId) {
        return;
      }

      lobbyMembersStore[index] = {
        ...member,
        rsvp_status: 'pending',
        response_comment: 'Time changed, please respond again',
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: nextIsoTimestamp(),
      };

      appendHistory(
        lobbyId,
        member.profile_id,
        currentSessionUserId!,
        'pending',
        'Time changed, please respond again',
        null,
        null,
        'host_apply',
      );
    });

    req.reply({
      statusCode: 200,
      body: lobbyStore[lobbyIndex],
    });
  }).as('applyLobbySuggestionRpc');

  cy.intercept('PATCH', '**/rest/v1/lobbies*', (req) => {
    const lobbyId = getQueryValue(req.url, 'id');
    const lobbyIndex = lobbyStore.findIndex((lobby) => lobby.id === lobbyId);

    if (lobbyIndex < 0) {
      req.reply({
        statusCode: 404,
        body: { message: 'Lobby not found' },
      });
      return;
    }

    const body = req.body as {
      scheduled_for?: string;
      scheduled_until?: string;
    };

    lobbyStore[lobbyIndex] = {
      ...lobbyStore[lobbyIndex],
      scheduled_for: body.scheduled_for ?? lobbyStore[lobbyIndex].scheduled_for,
      scheduled_until: body.scheduled_until ?? lobbyStore[lobbyIndex].scheduled_until,
    };

    req.reply({
      statusCode: 200,
      body: lobbyStore[lobbyIndex],
    });
  }).as('updateLobbyRequest');
};

describe('lobbies flow', () => {
  const novaUserId = makeUserId(novaEmail);
  const pixelUserId = makeUserId(pixelEmail);

  const signUpHost = () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    if (!profileGamesStore.has(hostAccount.userId)) {
      setOwnedGames(hostAccount.userId, games.map((game) => game.id));
    }
    cy.visit('/');
    cy.signupUi(hostEmail, hostPassword);
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
  };

  const logInAs = (email: string, password: string) => {
    cy.visit('/');
    cy.loginUi(email, password);
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
  };

  const clickSectionNav = (section: string) => {
    cy.get(`[data-testid="section-nav-${section}"]`).then(($button) => {
      $button[0].scrollIntoView({
        behavior: 'instant',
        block: 'nearest',
        inline: 'center',
      });
    });

    cy.get(`[data-testid="section-nav-${section}"]`).click({ force: true });
  };

  const logout = () => {
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="auth-email-input"]').should('exist');
  };

  const ensureLobbyGameReady = () => {
    cy.contains('Select a game').scrollIntoView();
    cy.get('body').should(($body) => {
      const hasGameButtons = $body.find('[data-testid^="lobby-game-"]').length > 0;
      const hasIgdbInput = $body.find('[data-testid="lobby-igdb-search-input"]').length > 0;

      expect(hasGameButtons || hasIgdbInput, 'lobby game picker or inline IGDB import to be ready').to.equal(true);
    });
    cy.get('body').then(($body) => {
      const gameButtons = $body.find('[data-testid^="lobby-game-"]');

      if (gameButtons.length > 0) {
        const alreadySelected = Array.from(gameButtons).some((button) => button.textContent?.includes('Selected'));
        if (!alreadySelected) {
          cy.get('[data-testid^="lobby-game-"]').first().click({ force: true });
        }
        cy.get('[data-testid="create-lobby-button"]').should('not.be.disabled');
        return;
      }

      cy.get('[data-testid="lobby-igdb-search-input"]').clear().type('portal');
      cy.get('[data-testid="lobby-igdb-search-button"]').click();
      cy.wait('@igdbSearchFunction');
      cy.get('[data-testid="lobby-igdb-import-button-1234"]').click();
      cy.wait('@igdbImportFunction');
      cy.get('[data-testid="create-lobby-button"]').should('not.be.disabled');
    });
  };

  const createLobbyWithInvitees = (inviteeIds: string[], options?: { submit?: boolean }) => {
    cy.contains(/^Lobbies$/).click({ force: true });
    ensureLobbyGameReady();

    inviteeIds.forEach((profileId) => {
      cy.get(`[data-testid="${`lobby-invite-chip-${profileId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}"]`).click();
    });

    if (options?.submit ?? true) {
      cy.get('[data-testid="create-lobby-button"]').click();
    }
  };

  const scrollToMeetupDetailsStep = () => {
    cy.contains('Meetup details').scrollIntoView();
  };

  beforeEach(() => {
    authStore.clear();
    games.splice(0, games.length, ...seedGames.map((game) => ({ ...game })));
    lobbyStore.length = 0;
    lobbyMembersStore.length = 0;
    lobbyHistoryStore.length = 0;
    friendshipStore.length = 0;
    profileDiscordGuildStore.length = 0;
    profileGamesStore.clear();
    currentSessionUserId = null;
    lobbySequence = 0;
    historySequence = 0;
    timestampSequence = 0;
    registerMockLobbies();
  });

  it('starts a lobby draft from a game card and creates a private lobby through the RPC', () => {
    signUpHost();

    cy.contains(/^Lobbies$/).click({ force: true });
    scrollToMeetupDetailsStep();
    cy.get('[data-testid="lobby-meetup-details-input"]').should('be.visible');

    cy.contains('Games').click();
    cy.get('[data-testid="games-search-input"]').type('Helix Arena');
    cy.contains(/^Create lobby$/).click();

    cy.get('[data-testid="lobby-title-input"]').should('exist');
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Helix Arena Lobby');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_game_id).to.equal('helix-arena');
        expect(body.p_is_private).to.equal(true);
        expect(body.p_invited_profile_ids).to.deep.equal([]);
        expect(body.p_scheduled_for).to.be.a('string');
        expect(body.p_scheduled_until).to.be.a('string');
      });

    cy.contains(/lobby created/i).should('exist');
    cy.contains('Helix Arena Lobby').should('be.visible');
    cy.contains(/private lobby/i).should('be.visible');
  });

  it('captures optional meetup details and carries them through hosted, incoming, and schedule views', () => {
    signUpHost();
    createLobbyWithInvitees([novaUserId], { submit: false });

    scrollToMeetupDetailsStep();
    cy.get('[data-testid="lobby-meetup-details-input"]').type('Discord voice room 2');
    cy.contains('Discord voice room 2').should('be.visible');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_meetup_details).to.equal('Discord voice room 2');
      });

    cy.contains('Meetup: Discord voice room 2').should('be.visible');
    cy.contains(/^Schedule$/).click({ force: true });
    cy.contains('Meetup: Discord voice room 2').should('be.visible');

    logout();
    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Meetup: Discord voice room 2').should('be.visible');
  });

  it('lets a user with an empty library import a game inline in lobbies and auto-select it for the draft', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });

    setOwnedGames(hostAccount.userId, []);

    signUpHost();
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains(/pick a game from your library to create a lobby/i).should('be.visible');
    cy.contains(/import a game here and we'll use it right away/i).should('be.visible');

    cy.get('[data-testid="lobby-igdb-search-input"]').type('portal');
    cy.get('[data-testid="lobby-igdb-search-button"]').click();

    cy.wait('@igdbSearchFunction');
    cy.get('[data-testid="lobby-igdb-result-1234"]').should('be.visible');
    cy.get('[data-testid="lobby-igdb-import-button-1234"]').click();

    cy.wait('@igdbImportFunction');
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Portal 2 Lobby');
    cy.contains(/^Portal 2$/).should('exist');
    cy.get('[data-testid="lobby-game-cover-igdb-1234"]').should('exist');
    cy.get('[data-testid="create-lobby-button"]').should('not.be.disabled');
  });

  it('opens a quick-add dialog from lobby step 1 and selects the imported game', () => {
    signUpHost();

    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="open-lobby-add-game-dialog-button"]').click();
    cy.get('[data-testid="lobby-add-game-search-input"]').should('be.visible').type('portal');
    cy.get('[data-testid="lobby-add-game-search-button"]').click();

    cy.wait('@igdbSearchFunction');
    cy.get('[data-testid="lobby-add-game-result-1234"]').should('be.visible');
    cy.get('[data-testid="lobby-add-game-import-button-1234"]').click();

    cy.wait('@igdbImportFunction');
    cy.get('[data-testid="lobby-add-game-search-input"]').should('not.exist');
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Portal 2 Lobby');
    cy.get('[data-testid="lobby-game-cover-igdb-1234"]').should('exist');
    cy.get('[data-testid="create-lobby-button"]').should('not.be.disabled');
  });

  it('hands a roulette winner and random accepted friends into the lobby draft', () => {
    signUpHost();

    cy.contains(/^Roulette$/).click({ force: true });
    cy.get('[data-testid="roulette-scope-button"]').click();
    cy.contains('Clear all').click();
    cy.get('[data-testid="roulette-scope-game-deep-raid"]').click();
    cy.contains('Done').click();

    cy.get('[data-testid="roulette-friend-count-2"]').click();
    cy.get('[data-testid="roulette-spin-friends-button"]').click();
    cy.contains('Nova Hex').should('be.visible');
    cy.contains('Pixel Moth').should('be.visible');

    cy.get('[data-testid="roulette-spin-button"]').click();
    cy.get('[data-testid="roulette-current-game-title"]').should('contain.text', 'Deep Raid');
    cy.get('[data-testid="roulette-use-for-lobby-button"]').scrollIntoView().click({ force: true });

    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Deep Raid Lobby');
    cy.contains(/2 invites ready/i).scrollIntoView().should('exist');
  });

  it('pages lobby game selection in sets of four on desktop web', () => {
    games.push(
      {
        id: 'castle-circuit',
        title: 'Castle Circuit',
        genre: 'Party Strategy',
        platform: 'PC / Console',
        player_count: '2-6 players',
        description: 'Short tactical rounds built for fast group sessions.',
        is_featured: false,
      },
      {
        id: 'drift-legends-x',
        title: 'Drift Legends X',
        genre: 'Racing',
        platform: 'PC / Console',
        player_count: '2-8 players',
        description: 'Competitive drifting playlists with quick rematches.',
        is_featured: false,
      },
      {
        id: 'void-divers',
        title: 'Void Divers',
        genre: 'Co-op Action',
        platform: 'PC',
        player_count: '2-4 players',
        description: 'Squad dives into short missions with escalating chaos.',
        is_featured: false,
      },
      {
        id: 'nebula-knights',
        title: 'Nebula Knights',
        genre: 'Action RPG',
        platform: 'PC / Console',
        player_count: '3-5 players',
        description: 'Flexible drop-in runs for a regular group night.',
        is_featured: false,
      },
      {
        id: 'midnight-brawl',
        title: 'Midnight Brawl',
        genre: 'Fighter',
        platform: 'PC / Console',
        player_count: '2-4 players',
        description: 'Fast versus rounds built for couch-style tournament energy.',
        is_featured: false,
      },
    );

    cy.viewport(1280, 900);
    signUpHost();

    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Select a game').scrollIntoView();
    cy.get('[data-testid="lobby-game-carousel"]').should('be.visible');
    cy.get('[data-testid="lobby-game-carousel-status"]').should('contain', '1-4 of 8');
    cy.get('[data-testid="lobby-game-cover-placeholder-helix-arena"]').should('exist');
    cy.get('[data-testid="lobby-game-carousel-prev"]').should('be.disabled');
    cy.get('[data-testid="lobby-game-carousel-next"]').should('not.be.disabled').click();
    cy.get('[data-testid="lobby-game-carousel-status"]').should('contain', '5-8 of 8');
    cy.contains(/^Drift Legends X$/).should('be.visible');
    cy.get('[data-testid="lobby-game-drift-legends-x"]').click();
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Drift Legends X Lobby');
    cy.get('[data-testid="lobby-game-carousel-next"]').should('be.disabled');
    cy.get('[data-testid="lobby-game-carousel-prev"]').click();
    cy.get('[data-testid="lobby-game-carousel-status"]').should('contain', '1-4 of 8');
  });

  it('creates a lobby from the mobile carousel without horizontal overflow', () => {
    cy.viewport(390, 844);
    signUpHost();

    clickSectionNav('lobbies');
    cy.contains('Select a game').scrollIntoView();
    cy.get('[data-testid="lobby-game-carousel"]').should('be.visible');
    cy.get('[data-testid="lobby-game-carousel-scroll"]').should('exist');
    cy.get('[data-testid="lobby-game-cover-placeholder-helix-arena"]').should('exist');
    cy.get('[data-testid="lobby-game-helix-arena"]').click({ force: true });
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Helix Arena Lobby');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_game_id).to.equal('helix-arena');
        expect(body.p_is_private).to.equal(true);
      });

    cy.contains(/lobby created/i).should('exist');
    assertNoHorizontalOverflow();
  });

  it('shows Busy for invitees with overlapping fixed-time commitments and still lets the host invite them', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    const { novaAccount } = ensureInviteGraphForHost(hostAccount);
    novaAccount.profile.busy_visibility = 'public';
    const eveningWindow = createEveningWindow();

    const busyLobby = buildLobby(
      novaAccount,
      'helix-arena',
      'Nova already booked',
      eveningWindow.startAt,
      eveningWindow.endAt,
      true,
    );
    lobbyStore.unshift(busyLobby);

    signUpHost();
    cy.contains(/^Lobbies$/).click({ force: true });
    ensureLobbyGameReady();
    cy.contains('Invite people').scrollIntoView();
    cy.contains(/^Busy$/).should('exist');
    cy.contains('Playing Helix Arena during this window').should('exist');
    cy.get(`[data-testid="${`lobby-invite-chip-${novaUserId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}"]`).click();
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_invited_profile_ids).to.deep.equal([novaUserId]);
      });
  });

  it('shows Maybe busy in yellow for open-ended overlapping sessions', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    const { novaAccount } = ensureInviteGraphForHost(hostAccount);
    novaAccount.profile.busy_visibility = 'public';
    const eveningWindow = createEveningWindow();

    const maybeBusyLobby = buildLobby(
      novaAccount,
      'wild-rally-online',
      'Nova open session',
      eveningWindow.startAt,
      null,
      true,
    );
    lobbyStore.unshift(maybeBusyLobby);

    signUpHost();
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Invite people').scrollIntoView();
    cy.contains(/^Maybe busy$/).should('exist');
    cy.contains(/Playing Wild Rally Online around/i).should('exist');
  });

  it('derives busy blocks from accepted membership, redacts private titles, and sends the expected RPC window', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    const { novaAccount, pixelAccount } = ensureInviteGraphForHost(hostAccount);
    novaAccount.profile.busy_visibility = 'private';
    const eveningWindow = createEveningWindow();

    const acceptedLobby = buildLobby(
      pixelAccount,
      'deep-raid',
      'Deep Raid Run',
      eveningWindow.startAt,
      eveningWindow.endAt,
      true,
    );
    lobbyStore.unshift(acceptedLobby);
    lobbyMembersStore.push(
      {
        lobby_id: acceptedLobby.id,
        profile_id: pixelAccount.userId,
        role: 'host',
        rsvp_status: 'accepted',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: nextIsoTimestamp(),
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      },
      {
        lobby_id: acceptedLobby.id,
        profile_id: novaAccount.userId,
        role: 'member',
        rsvp_status: 'accepted',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: nextIsoTimestamp(),
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      },
    );

    signUpHost();
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.wait('@busyBlocksRpc')
      .should(({ request, response }) => {
        expect(request.body.p_profile_ids).to.include(novaUserId);
        expect(request.body.p_window_start).to.be.a('string');
        expect(request.body.p_window_end).to.be.a('string');

        const novaBlock = response?.body.find((block: { profile_id: string }) => block.profile_id === novaUserId);
        expect(novaBlock).to.include({
          profile_id: novaUserId,
          busy_status: 'busy',
          game_title: null,
        });
      });

    cy.contains('Invite people').scrollIntoView();
    cy.contains(/^Busy$/).should('exist');
    cy.contains(/Already booked at this time/i).should('exist');
  });

  it('does not derive busy blocks from pending invite membership', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    const { novaAccount, pixelAccount } = ensureInviteGraphForHost(hostAccount);
    const eveningWindow = createEveningWindow();

    const pendingLobby = buildLobby(
      pixelAccount,
      'deep-raid',
      'Pending Invite Only',
      eveningWindow.startAt,
      eveningWindow.endAt,
      true,
    );
    lobbyStore.unshift(pendingLobby);
    lobbyMembersStore.push(
      {
        lobby_id: pendingLobby.id,
        profile_id: pixelAccount.userId,
        role: 'host',
        rsvp_status: 'accepted',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: nextIsoTimestamp(),
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      },
      {
        lobby_id: pendingLobby.id,
        profile_id: novaAccount.userId,
        role: 'member',
        rsvp_status: 'pending',
        response_comment: null,
        suggested_start_at: null,
        suggested_end_at: null,
        responded_at: null,
        invited_at: nextIsoTimestamp(),
        created_at: nextIsoTimestamp(),
      },
    );

    signUpHost();
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.wait('@busyBlocksRpc')
      .its('response.body')
      .should((blocks) => {
        const novaBlocks = blocks.filter((block: { profile_id: string }) => block.profile_id === novaUserId);
        expect(novaBlocks).to.have.length(0);
      });
  });

  it('creates real invite rows and shows invitees grouped under hosted lobbies', () => {
    signUpHost();

    createLobbyWithInvitees([novaUserId, pixelUserId]);

    cy.wait('@createLobbyRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_invited_profile_ids).to.deep.equal([novaUserId, pixelUserId]);
      });

    cy.contains(/2 invites sent/i).should('exist');
    cy.contains('Hosted lobbies').should('be.visible');
    cy.contains('Pending').should('exist');
    cy.contains('Nova Hex').should('exist');
    cy.contains('Pixel Moth').should('exist');
  });

  it('lets an invitee decline, then accept later, while preserving response history comments', () => {
    signUpHost();
    createLobbyWithInvitees([novaUserId]);
    logout();

    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="lobby-response-decline-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').type('Can only do one match tonight.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('declined');
        expect(body.p_comment).to.equal('Can only do one match tonight.');
        expect(body.p_suggested_start_at).to.equal(null);
      });

    cy.contains(/invite declined/i).should('exist');
    cy.contains('Can only do one match tonight.').should('exist');

    cy.get('[data-testid="lobby-response-accept-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').clear().type('Actually I can play for 2 hours.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('accepted');
        expect(body.p_comment).to.equal('Actually I can play for 2 hours.');
      });

    cy.contains(/invite accepted/i).should('exist');
    cy.contains('Your response history').should('exist');
    cy.contains('Actually I can play for 2 hours.').should('exist');
    cy.contains('Can only do one match tonight.').should('exist');
  });

  it('warns before accepting an overlapping invite and sends the accept on a second intentional submit', () => {
    const hostAccount = ensureAccount(hostEmail, hostPassword, {
      displayName: 'Host Player',
      username: 'hostplayer',
    });
    const { novaAccount, pixelAccount } = ensureInviteGraphForHost(hostAccount);
    const eveningWindow = createEveningWindow();

    const existingLobby = buildLobby(
      pixelAccount,
      'deep-raid',
      'Deep Raid Run',
      eveningWindow.startAt,
      eveningWindow.endAt,
      true,
    );
    lobbyStore.unshift(existingLobby);
    lobbyMembersStore.push({
      lobby_id: existingLobby.id,
      profile_id: pixelAccount.userId,
      role: 'host',
      rsvp_status: 'accepted',
      response_comment: null,
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
      invited_at: nextIsoTimestamp(),
      created_at: nextIsoTimestamp(),
    });
    lobbyMembersStore.push({
      lobby_id: existingLobby.id,
      profile_id: novaAccount.userId,
      role: 'member',
      rsvp_status: 'accepted',
      response_comment: null,
      suggested_start_at: null,
      suggested_end_at: null,
      responded_at: nextIsoTimestamp(),
      invited_at: nextIsoTimestamp(),
      created_at: nextIsoTimestamp(),
    });

    signUpHost();
    createLobbyWithInvitees([novaUserId]);
    logout();

    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="lobby-response-accept-lobby-2"]').click();
    cy.get('[data-testid="lobby-response-submit-lobby-2"]').click();
    cy.contains(/already on your schedule/i).should('exist');

    cy.get('[data-testid="lobby-response-submit-lobby-2"]').click();
    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('accepted');
      });

    cy.contains(/invite accepted/i).should('be.visible');
  });

  it('lets an invitee suggest a new time and lets the host apply it, resetting other invitees to pending', () => {
    signUpHost();
    createLobbyWithInvitees([novaUserId, pixelUserId]);
    logout();

    logInAs(novaEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.get('[data-testid="lobby-response-suggest-lobby-1"]').click();
    cy.get('[data-testid="lobby-response-comment-lobby-1"]').type('I get off work at 9, this is better.');
    cy.get('[data-testid="lobby-response-submit-lobby-1"]').click();

    cy.wait('@respondToInviteRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_status).to.equal('suggested_time');
        expect(body.p_comment).to.equal('I get off work at 9, this is better.');
        expect(body.p_suggested_start_at).to.be.a('string');
        expect(body.p_suggested_end_at).to.be.a('string');
      });

    cy.contains(/suggested time sent to the host/i).should('exist');
    logout();

    logInAs(hostEmail, hostPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Suggested time').should('exist');
    cy.contains('I get off work at 9, this is better.').should('exist');
    cy.get(`[data-testid="apply-lobby-suggestion-lobby-1-${novaUserId}"]`).click();

    cy.wait('@applyLobbySuggestionRpc')
      .its('request.body')
      .should((body) => {
        expect(body.p_lobby_id).to.equal('lobby-1');
        expect(body.p_profile_id).to.equal(novaUserId);
      });

    cy.contains(/suggested time applied/i).should('exist');
    cy.contains('Suggested time applied by host.').should('exist');
    logout();

    logInAs(pixelEmail, friendPassword);
    cy.contains(/^Lobbies$/).click({ force: true });
    cy.contains('Time changed, please respond again').should('exist');
    cy.contains('Pending').should('exist');
  });

  it('keeps host reschedule working from the schedule tab for hosted lobbies', () => {
    signUpHost();

    cy.contains(/^Lobbies$/).click({ force: true });
    ensureLobbyGameReady();
    cy.get('[data-testid="lobby-title-input"]').clear().type('Deep Raid Friday Run');
    cy.contains(/^Public$/).click();
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.wait('@createLobbyRpc');
    cy.contains(/^Schedule$/).click({ force: true });
    cy.contains('Deep Raid Friday Run').should('be.visible');
    cy.get('[data-testid="schedule-edit-lobby-lobby-1"]').click();
    cy.get('[data-testid="schedule-lobby-start-lobby-1"]').should('be.visible');
    cy.get('[data-testid="schedule-save-lobby-lobby-1"]').click();

    cy.wait('@updateLobbyRequest');
    cy.contains(/lobby time updated/i).should('be.visible');
  });
});

export {};
