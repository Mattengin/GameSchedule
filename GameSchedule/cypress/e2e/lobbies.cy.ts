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

type MockLobby = {
  id: string;
  title: string;
  scheduled_for: string | null;
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
  invite_count?: number;
};

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

const authStore = new Map<string, MockAccount>();
const lobbyStore = new Map<string, MockLobby[]>();

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

const buildLobby = (
  account: MockAccount,
  gameId: string,
  title: string,
  scheduledFor: string | null,
  isPrivate: boolean,
  inviteCount = 0,
): MockLobby => {
  const game = games.find((item) => item.id === gameId) ?? null;

  return {
    id: `lobby-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    scheduled_for: scheduledFor,
    is_private: isPrivate,
    status: 'scheduled',
    game_id: gameId,
    host_profile_id: account.userId,
    invite_count: inviteCount,
    games: game
      ? {
          id: game.id,
          title: game.title,
          genre: game.genre,
          platform: game.platform,
          player_count: game.player_count,
        }
      : null,
  };
};

const registerMockLobbies = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = makeAccount(email, password);

    authStore.set(account.userId, account);
    lobbyStore.set(account.userId, []);

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
    lobbyStore.set(account.userId, lobbyStore.get(account.userId) ?? []);

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

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('rouletteRequest');

  cy.intercept('GET', '**/rest/v1/lobbies*', (req) => {
    const account = Array.from(authStore.values())[0];
    const userId = account?.userId ?? '';
    const lobbies = lobbyStore.get(userId) ?? [];

    req.reply({
      statusCode: 200,
      body: lobbies,
    });
  }).as('lobbiesRequest');

  cy.intercept('POST', '**/rest/v1/lobbies*', (req) => {
    const {
      host_profile_id: hostProfileId,
      game_id: gameId,
      title,
      scheduled_for: scheduledFor,
      is_private: isPrivate,
      invite_count: inviteCount,
    } = req.body as {
      host_profile_id: string;
      game_id: string;
      title: string;
      scheduled_for: string | null;
      is_private: boolean;
      invite_count?: number;
    };

    const account = authStore.get(hostProfileId);

    if (!account) {
      req.reply({
        statusCode: 400,
        body: { message: 'Unknown host profile' },
      });
      return;
    }

    const lobby = buildLobby(account, gameId, title, scheduledFor, isPrivate, inviteCount ?? 0);
    const current = lobbyStore.get(hostProfileId) ?? [];
    lobbyStore.set(hostProfileId, [lobby, ...current]);

    req.reply({
      statusCode: 201,
      body: lobby,
    });
  }).as('createLobbyRequest');

  cy.intercept('POST', '**/rest/v1/lobby_members*', {
    statusCode: 201,
    body: {},
  }).as('createLobbyMemberRequest');
};

describe('lobbies flow', () => {
  const email = `cypress-lobbies-${Date.now()}@example.com`;
  const password = `Password123!${Date.now()}`;

  before(() => {
    authStore.clear();
    lobbyStore.clear();
  });

  beforeEach(() => {
    registerMockLobbies();
  });

  const signIn = () => {
    cy.visit('/');
    cy.signupUi(email, password);
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
  };

  it('starts a lobby draft from a game card and creates a private lobby', () => {
    signIn();

    cy.contains('Games').click();
    cy.contains('Helix Arena')
      .closest('[class*="css-view"]')
      .within(() => {
        cy.contains(/^Create lobby$/).click();
      });

    cy.contains(/^Lobbies$/).should('be.visible');
    cy.get('[data-testid="lobby-title-input"]').should('have.value', 'Helix Arena Lobby');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.contains(/lobby created/i).should('be.visible');
    cy.contains('Helix Arena Lobby').should('be.visible');
    cy.contains(/private/i).should('be.visible');
  });

  it('creates a scheduled public lobby and shows it on the schedule tab', () => {
    signIn();

    cy.contains('Lobbies').click();
    cy.contains('Deep Raid').click();
    cy.get('[data-testid="lobby-title-input"]').clear().type('Deep Raid Friday Run');
    cy.contains(/^Later$/).click();
    cy.get('[data-testid="lobby-scheduled-for-input"]').type('2026-04-10 20:30');
    cy.contains(/^Public$/).click();
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.contains(/lobby created/i).should('be.visible');
    cy.contains('Deep Raid Friday Run').should('be.visible');
    cy.contains(/public/i).should('be.visible');

    cy.contains('Schedule').click();
    cy.contains('Deep Raid Friday Run').should('be.visible');
  });

  it('tracks invite drafts in the lobby form and saved lobby card', () => {
    signIn();

    cy.contains('Lobbies').click();
    cy.get('[data-testid="lobby-invite-chip-novahex"]').click();
    cy.get('[data-testid="lobby-invite-chip-pixelmoth"]').click();
    cy.contains(/2 invite drafts/i).should('be.visible');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.contains(/2 invite drafts ready/i).should('be.visible');
    cy.contains(/prepared for 2 friends/i).should('be.visible');
  });

  it('shows a validation message when later is selected without a valid date', () => {
    signIn();

    cy.contains('Lobbies').click();
    cy.contains(/^Later$/).click();
    cy.get('[data-testid="lobby-scheduled-for-input"]').clear().type('not-a-date');
    cy.get('[data-testid="create-lobby-button"]').click();

    cy.contains(/enter a valid date and time for later/i).should('be.visible');
    cy.contains(/no lobbies yet/i).should('be.visible');
  });
});
