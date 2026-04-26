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

type MockProfileGameRow = {
  created_at: string;
  game_id: string;
  games: {
    id: string;
    title: string;
    genre: string;
    platform: string;
    player_count: string;
    description: string | null;
    is_featured: boolean;
    igdb_id: number | null;
    cover_url: string | null;
    release_date: string | null;
    rating: number | null;
    source: 'seed' | 'igdb';
  };
};

const authStore = new Map<string, MockAccount>();
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
      friend_code: makeFriendCode(username),
      avatar_url: null,
      display_name: 'Mobile Layout Tester',
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
  const decodedUrl = decodeURIComponent(url);
  const match = new RegExp(`${key}=eq\\.([^&]+)`).exec(decodedUrl);
  return match ? decodeURIComponent(match[1]) : '';
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

const registerMobileLayoutMocks = (account: MockAccount, profileGames: MockProfileGameRow[]) => {
  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    authStore.set(account.userId, account);

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
    const matchedAccount = authStore.get(userId);

    req.reply({
      statusCode: 200,
      body: matchedAccount?.profile ?? null,
    });
  }).as('profilesRequest');

  cy.intercept('PATCH', '**/rest/v1/profiles*', (req) => {
    const userId = getQueryValue(req.url, 'id');
    const matchedAccount = authStore.get(userId) ?? account;

    matchedAccount.profile = {
      ...matchedAccount.profile,
      ...(req.body as Partial<MockProfile>),
    };

    authStore.set(matchedAccount.userId, matchedAccount);

    req.reply({
      statusCode: 200,
      body: matchedAccount.profile,
    });
  }).as('profileUpdateRequest');

  cy.intercept('**/auth/v1/user*', {
    statusCode: 200,
    body: {
      user: {
        id: account.userId,
        email: account.email,
      },
    },
  }).as('updateUserRequest');

  cy.intercept('GET', '**/rest/v1/profile_games*', {
    statusCode: 200,
    body: profileGames,
  }).as('profileGamesRequest');

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('roulettePoolRequest');

  cy.intercept('GET', '**/rest/v1/friends*', {
    statusCode: 200,
    body: [],
  }).as('friendsRequest');

  cy.intercept('GET', '**/rest/v1/friend_requests*', {
    statusCode: 200,
    body: [],
  }).as('friendRequestsRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', {
    statusCode: 200,
    body: null,
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');

  cy.intercept('GET', '**/rest/v1/lobbies*', {
    statusCode: 200,
    body: [],
  }).as('lobbiesRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_profile_busy_blocks', {
    statusCode: 200,
    body: [],
  }).as('busyBlocksRpc');

  cy.intercept('POST', '**/rest/v1/rpc/get_visible_profiles', {
    statusCode: 200,
    body: [],
  }).as('visibleProfilesRpc');

};

describe('mobile layout smoke', () => {
  const accountEmail = `mobile-layout-${Date.now()}@example.com`;
  const accountPassword = 'MobileLayout123!';
  const account = makeAccount(accountEmail, accountPassword);
  const profileGames: MockProfileGameRow[] = [
    {
      created_at: new Date().toISOString(),
      game_id: 'helix-arena',
      games: {
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
    },
    {
      created_at: new Date().toISOString(),
      game_id: 'deep-raid',
      games: {
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
    },
    {
      created_at: new Date().toISOString(),
      game_id: 'wild-rally-online',
      games: {
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
    },
    {
      created_at: new Date().toISOString(),
      game_id: 'castle-circuit',
      games: {
        id: 'castle-circuit',
        title: 'Castle Circuit',
        genre: 'Party Strategy',
        platform: 'PC / Console',
        player_count: '2-6 players',
        description: 'Short tactical rounds built for fast group sessions.',
        is_featured: false,
        igdb_id: null,
        cover_url: null,
        release_date: null,
        rating: null,
        source: 'seed',
      },
    },
    {
      created_at: new Date().toISOString(),
      game_id: 'drift-legends-x',
      games: {
        id: 'drift-legends-x',
        title: 'Drift Legends X',
        genre: 'Racing',
        platform: 'PC / Console',
        player_count: '2-8 players',
        description: 'Competitive drifting playlists with quick rematches.',
        is_featured: false,
        igdb_id: null,
        cover_url: null,
        release_date: null,
        rating: null,
        source: 'seed',
      },
    },
  ];

  beforeEach(() => {
    authStore.clear();
    registerMobileLayoutMocks(account, profileGames);
  });

  it('keeps core authenticated sections within a latest iPhone-sized viewport', () => {
    // Cypress presets stop at older iPhones, so use explicit CSS pixels for the latest released iPhone 16e.
    cy.viewport(390, 844);

    cy.visit('/');
    cy.loginUi(accountEmail, accountPassword);
    cy.wait('@signinRequest');
    cy.wait('@profilesRequest');
    cy.wait('@profileGamesRequest');

    cy.contains(/play together, faster/i).should('be.visible');
    assertNoHorizontalOverflow();

    clickSectionNav('games');
    cy.contains(/^Game library$/).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();

    clickSectionNav('roulette');
    cy.contains(/^Game roulette$/).scrollIntoView().should('be.visible');
    cy.get('[data-testid="roulette-scope-button"]').click();
    cy.contains('Choose games').should('be.visible');
    cy.contains('Clear all').scrollIntoView().click({ force: true });
    cy.get('[data-testid="roulette-scope-game-deep-raid"]').scrollIntoView().click({ force: true });
    cy.contains('Done').click({ force: true });
    cy.get('[data-testid="roulette-spin-button"]').click();
    cy.contains('Use for lobby').should('be.visible');
    assertNoHorizontalOverflow();

    clickSectionNav('lobbies');
    cy.contains(/^Create event$/).scrollIntoView().should('be.visible');
    cy.get('[data-testid="lobby-game-carousel"]').scrollIntoView().should('be.visible');
    cy.get('[data-testid="lobby-game-carousel-scroll"]').should('exist');
    assertNoHorizontalOverflow();

    clickSectionNav('friends');
    cy.contains(/^Add by friend code$/).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();

    clickSectionNav('profile');
    cy.contains(/^Your friend code$/).scrollIntoView().should('be.visible');
    cy.contains(/^Profile details$/).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();
  });

  it('keeps Home reachable without auto-redirecting into Friends', () => {
    cy.viewport(390, 844);

    cy.visit('/');
    cy.loginUi(accountEmail, accountPassword);
    cy.wait('@signinRequest');
    cy.wait('@profilesRequest');

    cy.contains(/play together, faster/i).scrollIntoView().should('be.visible');
    clickSectionNav('friends');
    cy.contains(/^Add by friend code$/).scrollIntoView().should('be.visible');
    clickSectionNav('dashboard');
    cy.contains(/play together, faster/i).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();
  });
});
