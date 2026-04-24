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

type MockAccount = {
  email: string;
  password: string;
  userId: string;
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    display_name: string;
    onboarding_complete: boolean;
    birthday_month?: number | null;
    birthday_day?: number | null;
    birthday_visibility?: 'private' | 'public';
  };
};

const authStore = new Map<string, MockAccount>();
const favoriteStore = new Map<string, string[]>();
const rouletteStore = new Map<string, string[]>();
const baseGames: MockGame[] = [
  {
    id: 'helix-arena',
    title: 'Helix Arena',
    genre: 'Hero Shooter',
    platform: 'PC / Console',
    player_count: '3-5 players',
    description: 'Fast team-based matches with hero abilities and short queue times.',
    is_featured: true,
    igdb_id: null,
    cover_url: null,
    release_date: null,
    rating: null,
    source: 'seed',
  },
  {
    id: 'deep-raid',
    title: 'Deep Raid',
    genre: 'Extraction',
    platform: 'PC',
    player_count: '2-4 players',
    description: 'High-risk co-op missions with short planning sessions and long-term loot.',
    is_featured: true,
    igdb_id: null,
    cover_url: null,
    release_date: null,
    rating: null,
    source: 'seed',
  },
  {
    id: 'wild-rally-online',
    title: 'Wild Rally Online',
    genre: 'Racing',
    platform: 'Cross-platform',
    player_count: '2-12 players',
    description: 'Chaotic off-road playlists with short races and easy drop-in play.',
    is_featured: true,
    igdb_id: null,
    cover_url: null,
    release_date: null,
    rating: null,
    source: 'seed',
  },
];

let games: MockGame[] = [];

const igdbResultsByQuery: Record<string, MockIgdbGame[]> = {
  portal: [
    {
      igdb_id: 1234,
      title: 'Portal 2',
      genre: 'Puzzle / Platform',
      platform: 'PC / PlayStation / Xbox',
      player_count: '2+ players',
      description: 'Solve co-op puzzles with portals, timing, and a very patient robot voice.',
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg',
      release_date: '2011-04-19',
      rating: 95,
      source: 'igdb',
    },
  ],
};

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const makeAccount = (email: string, password: string): MockAccount => {
  const userId = makeUserId(email);
  const username = email.split('@')[0].toLowerCase();

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username,
      avatar_url: null,
      display_name: username,
      onboarding_complete: true,
    },
  };
};

const makeAuthBody = (account: MockAccount) => {
  const now = new Date().toISOString();

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

const getQueryValue = (url: string, key: string) => {
  const match = new RegExp(`${key}=eq\\.([^&]+)`).exec(url);
  return match ? decodeURIComponent(match[1]) : '';
};

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

const registerMockGameSocial = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = makeAccount(email, password);

    authStore.set(account.userId, account);
    favoriteStore.set(account.userId, []);
    rouletteStore.set(account.userId, []);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const userId = makeUserId(email);
    const account = authStore.get(userId) ?? makeAccount(email, password);

    authStore.set(account.userId, account);
    favoriteStore.set(account.userId, favoriteStore.get(account.userId) ?? []);
    rouletteStore.set(account.userId, rouletteStore.get(account.userId) ?? []);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signinRequest');

  cy.intercept('POST', '**/auth/v1/logout', {
    statusCode: 204,
    body: {},
  }).as('logoutRequest');

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const userId = getQueryValue(req.url, 'id');
    const account = authStore.get(userId);

    req.reply({
      statusCode: 200,
      body: account?.profile ?? null,
    });
  }).as('profileRequest');

  cy.intercept('GET', '**/rest/v1/games*', (req) => {
    req.reply({
      statusCode: 200,
      body: games,
    });
  }).as('gamesRequest');

  cy.intercept('POST', '**/functions/v1/igdb-search', (req) => {
    const query = String((req.body as { query?: string }).query ?? '').toLowerCase();

    if (query.includes('overload')) {
      req.reply({
        statusCode: 429,
        body: { error: 'IGDB is rate-limiting search right now. Try again in a few seconds.' },
      });
      return;
    }

    const results = Object.entries(igdbResultsByQuery).find(([key]) => query.includes(key))?.[1] ?? [];

    req.reply({
      statusCode: 200,
      body: { results },
    });
  }).as('igdbSearchRequest');

  cy.intercept('POST', '**/functions/v1/igdb-import-game', (req) => {
    const payload = req.body as MockIgdbGame;
    const importedGame = makeImportedGameRecord(payload);
    const existingIndex = games.findIndex(
      (game) => game.igdb_id === payload.igdb_id || game.title === payload.title,
    );

    if (existingIndex >= 0) {
      games[existingIndex] = {
        ...games[existingIndex],
        ...importedGame,
        id: games[existingIndex].id,
      };
    } else {
      games = [...games, importedGame];
    }

    req.reply({
      statusCode: 200,
      body: {
        game: existingIndex >= 0 ? games[existingIndex] : importedGame,
      },
    });
  }).as('igdbImportRequest');

  cy.intercept('GET', '**/rest/v1/favorite_games*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    const favorites = favoriteStore.get(userId) ?? [];

    req.reply({
      statusCode: 200,
      body: favorites.map((gameId) => ({ game_id: gameId })),
    });
  }).as('favoriteGamesRequest');

  cy.intercept('POST', '**/rest/v1/favorite_games*', (req) => {
    const { profile_id: userId, game_id: gameId } = req.body as {
      profile_id: string;
      game_id: string;
    };
    const current = favoriteStore.get(userId) ?? [];

    favoriteStore.set(userId, current.includes(gameId) ? current : [...current, gameId]);
    req.reply({
      statusCode: 201,
      body: {},
    });
  }).as('favoriteGamesInsert');

  cy.intercept('DELETE', '**/rest/v1/favorite_games*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    const gameId = getQueryValue(req.url, 'game_id');
    const current = favoriteStore.get(userId) ?? [];

    favoriteStore.set(
      userId,
      current.filter((id) => id !== gameId),
    );
    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('favoriteGamesDelete');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    const pool = rouletteStore.get(userId) ?? [];

    req.reply({
      statusCode: 200,
      body: pool.map((gameId) => {
        const game = games.find((item) => item.id === gameId);
        return {
          game_id: gameId,
          games: game
            ? {
                id: game.id,
                title: game.title,
                genre: game.genre,
                platform: game.platform,
              }
            : null,
        };
      }),
    });
  }).as('rouletteRequest');

  cy.intercept('POST', '**/rest/v1/roulette_pool_entries*', (req) => {
    const { profile_id: userId, game_id: gameId } = req.body as {
      profile_id: string;
      game_id: string;
    };
    const current = rouletteStore.get(userId) ?? [];

    rouletteStore.set(userId, current.includes(gameId) ? current : [...current, gameId]);
    req.reply({
      statusCode: 201,
      body: {},
    });
  }).as('rouletteInsert');

  cy.intercept('DELETE', '**/rest/v1/roulette_pool_entries*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    const gameId = getQueryValue(req.url, 'game_id');
    const current = rouletteStore.get(userId) ?? [];

    rouletteStore.set(
      userId,
      current.filter((id) => id !== gameId),
    );
    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('rouletteDelete');

  cy.intercept('GET', '**/rest/v1/lobbies*', {
    statusCode: 200,
    body: [],
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/lobby_members*', {
    statusCode: 200,
    body: [],
  }).as('lobbyMembersRequest');

  cy.intercept('GET', '**/rest/v1/lobby_member_response_history*', {
    statusCode: 200,
    body: [],
  }).as('lobbyHistoryRequest');

  cy.intercept('GET', '**/rest/v1/profile_discord_guilds*', {
    statusCode: 200,
    body: [],
  }).as('discordGuildsRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', {
    statusCode: 200,
    body: null,
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');

  cy.intercept('GET', '**/rest/v1/friends*', {
    statusCode: 200,
    body: [],
  }).as('friendsRequest');

  cy.intercept('GET', '**/rest/v1/friend_requests*', {
    statusCode: 200,
    body: [],
  }).as('friendRequestsRequest');

  cy.intercept('GET', '**/rest/v1/communities*', {
    statusCode: 200,
    body: null,
  }).as('communitiesRequest');

  cy.intercept('GET', '**/rest/v1/community_members*', {
    statusCode: 200,
    body: [],
  }).as('communityMembersRequest');
};

describe('game social persistence', () => {
  const email = `cypress-game-social-${Date.now()}@example.com`;
  const password = `Password123!${Date.now()}`;

  before(() => {
    authStore.clear();
    favoriteStore.clear();
    rouletteStore.clear();
  });

  beforeEach(() => {
    games = baseGames.map((game) => ({ ...game }));
    registerMockGameSocial();
  });

  const signInAndOpenGames = () => {
    cy.visit('/');
    cy.signupUi(email, password);
    cy.contains('Games').click();
    cy.contains(/supabase-backed library/i).should('be.visible');
  };

  it('favorites a game and shows it in the profile favorites section', () => {
    signInAndOpenGames();

    cy.contains('Helix Arena')
      .closest('[class*="css-view"]')
      .within(() => {
        cy.contains(/^Favorite$/).click();
      });

    cy.contains(/game added to favorites/i).should('exist');
    cy.contains('Profile').click();
    cy.contains('Favorite games').scrollIntoView().should('exist');
    cy.contains('Helix Arena').should('be.visible');
  });

  it('adds a game to the roulette pool and shows it on the roulette screen', () => {
    signInAndOpenGames();

    cy.contains('Deep Raid')
      .closest('[class*="css-view"]')
      .within(() => {
        cy.contains(/^Add to pool$/).click();
      });

    cy.contains(/game added to roulette pool/i).should('be.visible');
    cy.contains('Roulette').click();
    cy.contains(/you currently have 1 game in your pool/i).should('be.visible');
    cy.contains('Deep Raid').should('be.visible');
  });

  it('removes games from favorites and roulette after they were added', () => {
    signInAndOpenGames();

    cy.contains('Wild Rally Online')
      .closest('[class*="css-view"]')
      .within(() => {
        cy.contains(/^Favorite$/).click();
        cy.contains(/^Add to pool$/).click();
      });

    cy.contains('Wild Rally Online')
      .closest('[class*="css-view"]')
      .within(() => {
        cy.contains(/^Unfavorite$/).click();
        cy.contains(/^Remove from pool$/).click();
      });

    cy.contains('Profile').click();
    cy.contains('Favorite games').scrollIntoView().should('exist');
    cy.contains('Wild Rally Online').should('not.exist');

    cy.contains('Roulette').click();
    cy.contains(/your pool is empty/i).should('be.visible');
  });

  it('imports an IGDB result into the library and supports favorite plus roulette actions', () => {
    signInAndOpenGames();

    cy.get('[data-testid="igdb-search-input"]').clear().type('portal');
    cy.get('[data-testid="igdb-search-button"]').click();

    cy.contains('Portal 2').should('be.visible');
    cy.get('[data-testid="igdb-import-button-1234"]').click();

    cy.contains(/portal 2 imported into your library/i).should('be.visible');
    cy.get('[data-testid="game-library-card-igdb-1234"]').scrollIntoView().within(() => {
      cy.get('[data-testid="game-library-favorite-igdb-1234"]').click();
      cy.get('[data-testid="game-library-pool-igdb-1234"]').click();
    });

    cy.contains('Profile').click();
    cy.contains('Favorite games').scrollIntoView().should('exist');
    cy.contains('Portal 2').should('be.visible');

    cy.contains('Roulette').click();
    cy.contains('Portal 2').should('be.visible');
  });

  it('uses an imported IGDB game to seed the lobby draft', () => {
    signInAndOpenGames();

    cy.get('[data-testid="igdb-search-input"]').clear().type('portal');
    cy.get('[data-testid="igdb-search-button"]').click();
    cy.get('[data-testid="igdb-import-button-1234"]').click();

    cy.get('[data-testid="game-library-card-igdb-1234"]').scrollIntoView().within(() => {
      cy.get('[data-testid="game-library-create-lobby-igdb-1234"]').click();
    });

    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Portal 2 Lobby');
  });

  it('shows a friendly message when IGDB rate-limits search and re-enables search after cooldown', () => {
    signInAndOpenGames();

    cy.get('[data-testid="igdb-search-input"]').clear().type('overload');
    cy.get('[data-testid="igdb-search-button"]').click();

    cy.contains(/igdb is rate-limiting search right now/i).should('be.visible');
    cy.contains(/give igdb a second between searches/i).should('be.visible');
    cy.get('[data-testid="igdb-search-button"]').should('be.disabled');

    cy.wait(2200);

    cy.get('[data-testid="igdb-search-button"]').should('not.be.disabled');
  });
});

export {};
