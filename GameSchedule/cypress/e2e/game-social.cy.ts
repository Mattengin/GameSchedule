type MockGame = {
  id: string;
  title: string;
  genre: string;
  platform: string;
  player_count: string;
  description: string;
  is_featured: boolean;
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
  };
};

const authStore = new Map<string, MockAccount>();
const favoriteStore = new Map<string, string[]>();
const rouletteStore = new Map<string, string[]>();

const games: MockGame[] = [
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

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: games,
  }).as('gamesRequest');

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

    cy.contains(/game added to favorites/i).should('be.visible');
    cy.contains('Profile').click();
    cy.contains('Favorite games').should('be.visible');
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
    cy.contains('Favorite games').should('be.visible');
    cy.contains('Wild Rally Online').should('not.exist');

    cy.contains('Roulette').click();
    cy.contains(/your pool is empty/i).should('be.visible');
  });
});
