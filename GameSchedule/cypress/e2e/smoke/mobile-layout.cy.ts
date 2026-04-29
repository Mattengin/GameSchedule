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

type MockLobbyRow = {
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
  games: MockProfileGameRow['games'] | null;
};

type MockLobbyMemberRow = {
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

type MockVisibleProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  birthday_label: string | null;
  is_discord_connected: boolean;
};

type MobileLayoutMockConfig = {
  lobbies?: MockLobbyRow[];
  lobbyMembers?: MockLobbyMemberRow[];
  visibleProfiles?: MockVisibleProfile[];
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
  cy.get('body').then(($body) => {
    if (
      $body.find('[data-testid="section-nav-menu-button"]').length > 0 &&
      $body.find(`[data-testid="section-nav-${section}"]`).length === 0
    ) {
      cy.get('[data-testid="section-nav-menu-button"]').click({ force: true });
      cy.get('[data-testid="section-nav-menu-content"]').should('be.visible');
    }
  });

  cy.get(`[data-testid="section-nav-${section}"]`).click({ force: true });
};

const registerMobileLayoutMocks = (
  account: MockAccount,
  profileGames: MockProfileGameRow[],
  config: MobileLayoutMockConfig = {},
) => {
  const lobbies = config.lobbies ?? [];
  const lobbyMembers = config.lobbyMembers ?? [];
  const visibleProfiles = config.visibleProfiles ?? [];

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

  cy.intercept('GET', '**/rest/v1/friend_groups*', {
    statusCode: 200,
    body: [],
  }).as('friendGroupsRequest');

  cy.intercept('GET', '**/rest/v1/friend_group_members*', {
    statusCode: 200,
    body: [],
  }).as('friendGroupMembersRequest');

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
    body: lobbies,
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/lobby_members*', {
    statusCode: 200,
    body: lobbyMembers,
  }).as('lobbyMembersRequest');

  cy.intercept('GET', '**/rest/v1/lobby_member_response_history*', {
    statusCode: 200,
    body: [],
  }).as('lobbyHistoryRequest');

  cy.intercept('POST', '**/rest/v1/rpc/get_profile_busy_blocks', {
    statusCode: 200,
    body: [],
  }).as('busyBlocksRpc');

  cy.intercept('POST', '**/rest/v1/rpc/get_visible_profiles', {
    statusCode: 200,
    body: visibleProfiles,
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

  it('keeps core authenticated sections within a latest iPhone-sized viewport', () => {
    authStore.clear();
    registerMobileLayoutMocks(account, profileGames);

    // Cypress presets stop at older iPhones, so use explicit CSS pixels for the latest released iPhone 16e.
    cy.viewport(390, 844);

    cy.visit('/');
    cy.loginUi(accountEmail, accountPassword);
    cy.wait('@signinRequest');
    cy.wait('@profilesRequest');
    cy.wait('@profileGamesRequest');

    cy.contains(/play together, faster/i).should('be.visible');
    cy.contains(/nothing scheduled yet/i).should('be.visible');
    cy.contains(/tonight's fastest route/i).should('not.exist');
    cy.contains(/^featured games$/i).should('not.exist');
    cy.contains(/roulette is library-first now/i).should('not.exist');
    assertNoHorizontalOverflow();

    clickSectionNav('games');
    cy.contains(/^Game library$/).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();

    clickSectionNav('roulette');
    cy.contains(/^Game roulette$/).scrollIntoView().should('be.visible');
    cy.get('[data-testid="roulette-scope-button"]').click();
    cy.contains('Filter games').should('be.visible');
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

  it('shows real upcoming events and opens Schedule from the dashboard', () => {
    authStore.clear();

    const now = new Date();
    const plusDays = (days: number, hour: number, minute: number) => {
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + days);
      nextDate.setHours(hour, minute, 0, 0);
      return nextDate.toISOString();
    };

    const hostedStartAt = plusDays(1, 19, 0);
    const hostedEndAt = plusDays(1, 21, 0);
    const acceptedStartAt = plusDays(2, 20, 30);
    const acceptedEndAt = plusDays(2, 22, 0);
    const pendingStartAt = plusDays(4, 18, 45);
    const pendingEndAt = plusDays(4, 20, 15);
    const remoteHostId = 'friend-host-01';
    const pendingHostId = 'friend-host-02';

    registerMobileLayoutMocks(account, profileGames, {
      lobbies: [
        {
          id: 'hosted-lobby',
          title: 'Helix Arena Ranked',
          scheduled_for: hostedStartAt,
          scheduled_until: hostedEndAt,
          meetup_details: 'Discord voice',
          discord_guild_id: null,
          discord_guild_name: null,
          discord_guild_icon_url: null,
          is_private: true,
          status: 'scheduled',
          game_id: 'helix-arena',
          host_profile_id: account.userId,
          games: profileGames[0].games,
        },
        {
          id: 'accepted-lobby',
          title: 'Deep Raid Night',
          scheduled_for: acceptedStartAt,
          scheduled_until: acceptedEndAt,
          meetup_details: null,
          discord_guild_id: null,
          discord_guild_name: null,
          discord_guild_icon_url: null,
          is_private: true,
          status: 'scheduled',
          game_id: 'deep-raid',
          host_profile_id: remoteHostId,
          games: profileGames[1].games,
        },
        {
          id: 'pending-lobby',
          title: 'Wild Rally Warmup',
          scheduled_for: pendingStartAt,
          scheduled_until: pendingEndAt,
          meetup_details: null,
          discord_guild_id: null,
          discord_guild_name: null,
          discord_guild_icon_url: null,
          is_private: true,
          status: 'scheduled',
          game_id: 'wild-rally-online',
          host_profile_id: pendingHostId,
          games: profileGames[2].games,
        },
        {
          id: 'unscheduled-lobby',
          title: 'Unscheduled Draft',
          scheduled_for: null,
          scheduled_until: null,
          meetup_details: null,
          discord_guild_id: null,
          discord_guild_name: null,
          discord_guild_icon_url: null,
          is_private: true,
          status: 'open',
          game_id: 'castle-circuit',
          host_profile_id: pendingHostId,
          games: profileGames[3].games,
        },
      ],
      lobbyMembers: [
        {
          lobby_id: 'accepted-lobby',
          profile_id: account.userId,
          role: 'member',
          rsvp_status: 'accepted',
          response_comment: null,
          suggested_start_at: null,
          suggested_end_at: null,
          responded_at: acceptedStartAt,
          invited_at: acceptedStartAt,
          created_at: acceptedStartAt,
        },
        {
          lobby_id: 'pending-lobby',
          profile_id: account.userId,
          role: 'member',
          rsvp_status: 'pending',
          response_comment: null,
          suggested_start_at: null,
          suggested_end_at: null,
          responded_at: null,
          invited_at: pendingStartAt,
          created_at: pendingStartAt,
        },
      ],
      visibleProfiles: [
        {
          id: account.userId,
          username: account.profile.username,
          avatar_url: null,
          display_name: account.profile.display_name,
          birthday_label: null,
          is_discord_connected: false,
        },
        {
          id: remoteHostId,
          username: 'raidlead',
          avatar_url: null,
          display_name: 'Raid Lead',
          birthday_label: null,
          is_discord_connected: false,
        },
        {
          id: pendingHostId,
          username: 'rallyhost',
          avatar_url: null,
          display_name: 'Rally Host',
          birthday_label: null,
          is_discord_connected: false,
        },
      ],
    });

    cy.viewport(390, 844);

    cy.visit('/');
    cy.loginUi(accountEmail, accountPassword);
    cy.wait('@signinRequest');
    cy.wait('@profilesRequest');
    cy.wait('@lobbiesRequest');
    cy.wait('@lobbyMembersRequest');
    cy.wait('@visibleProfilesRpc');

    cy.contains(/play together, faster/i).scrollIntoView().should('be.visible');
    cy.get('[data-testid="dashboard-upcoming-events"]').should('be.visible');
    cy.get('[data-testid="dashboard-event-hosted-lobby"]').should('contain.text', 'Hosting');
    cy.get('[data-testid="dashboard-event-accepted-lobby"]').should('contain.text', 'Accepted');
    cy.get('[data-testid="dashboard-event-pending-lobby"]').should('contain.text', 'Pending invite');
    cy.contains('Helix Arena Ranked').should('be.visible');
    cy.contains('Deep Raid Night').should('be.visible');
    cy.contains('Wild Rally Warmup').should('be.visible');
    cy.contains('Unscheduled Draft').should('not.exist');

    cy.get('[data-testid="dashboard-open-schedule-button"]').click();
    cy.contains(/^Weekly availability$/).scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();
  });
});
