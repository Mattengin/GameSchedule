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

const authStore = new Map<string, MockAccount>();
const profileUpdateBodies: Record<string, unknown>[] = [];
const updateUserBodies: Record<string, unknown>[] = [];

const makeUserId = (email: string) => `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const makeFriendCode = (seed: string) => {
  const normalizedSeed = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(12, 'X');
  return `GS-${normalizedSeed.slice(0, 4)}-${normalizedSeed.slice(4, 8)}-${normalizedSeed.slice(8, 12)}`;
};

const makeAccount = (email: string, password: string): MockAccount => {
  const userId = makeUserId(email);
  const username = email.split('@')[0].toLowerCase();
  const now = new Date().toISOString();

  return {
    email,
    password,
    userId,
    profile: {
      id: userId,
      username,
      friend_code: makeFriendCode(username),
      avatar_url: null,
      display_name: 'Test Pilot',
      onboarding_complete: true,
      birthday_month: null,
      birthday_day: null,
      birthday_visibility: 'private',
      busy_visibility: 'public',
      primary_community_id: null,
      discord_user_id: `discord-${userId}`,
      discord_username: 'Test Pilot',
      discord_avatar_url: null,
      discord_connected_at: now,
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

const replaceTextInputValue = (selector: string, _previousValue: string, nextValue: string) => {
  const eraseKeys = Array.from({ length: 80 }, () => '{backspace}').join('');
  cy.get(selector).click().type(`{end}${eraseKeys}${nextValue}`);
};

const registerMockAccountSettings = (account: MockAccount) => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    authStore.set(account.userId, account);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

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
    profileUpdateBodies.push(req.body as Record<string, unknown>);

    const userId = getQueryValue(req.url, 'id');
    const matchedAccount = authStore.get(userId) ?? account;
    const body = req.body as Partial<MockProfile>;

    matchedAccount.profile = {
      ...matchedAccount.profile,
      username: typeof body.username === 'string' ? body.username : matchedAccount.profile.username,
      display_name:
        typeof body.display_name === 'string' ? body.display_name : matchedAccount.profile.display_name,
      avatar_url: body.avatar_url === null || typeof body.avatar_url === 'string'
        ? body.avatar_url
        : matchedAccount.profile.avatar_url,
      onboarding_complete:
        typeof body.onboarding_complete === 'boolean'
          ? body.onboarding_complete
          : matchedAccount.profile.onboarding_complete,
      birthday_month:
        body.birthday_month === null || typeof body.birthday_month === 'number'
          ? body.birthday_month
          : matchedAccount.profile.birthday_month,
      birthday_day:
        body.birthday_day === null || typeof body.birthday_day === 'number'
          ? body.birthday_day
          : matchedAccount.profile.birthday_day,
      birthday_visibility:
        body.birthday_visibility === 'private' || body.birthday_visibility === 'public'
          ? body.birthday_visibility
          : matchedAccount.profile.birthday_visibility,
      busy_visibility:
        body.busy_visibility === 'private' || body.busy_visibility === 'public'
          ? body.busy_visibility
          : matchedAccount.profile.busy_visibility,
      discord_user_id:
        body.discord_user_id === null || typeof body.discord_user_id === 'string'
          ? body.discord_user_id
          : matchedAccount.profile.discord_user_id,
      discord_username:
        body.discord_username === null || typeof body.discord_username === 'string'
          ? body.discord_username
          : matchedAccount.profile.discord_username,
      discord_avatar_url:
        body.discord_avatar_url === null || typeof body.discord_avatar_url === 'string'
          ? body.discord_avatar_url
          : matchedAccount.profile.discord_avatar_url,
      discord_connected_at:
        body.discord_connected_at === null || typeof body.discord_connected_at === 'string'
          ? body.discord_connected_at
          : matchedAccount.profile.discord_connected_at,
    };

    authStore.set(matchedAccount.userId, matchedAccount);

    req.reply({
      statusCode: 200,
      body: matchedAccount.profile,
    });
  }).as('profileUpdateRequest');

  cy.intercept('DELETE', '**/rest/v1/profile_discord_guilds*', {
    statusCode: 204,
    body: {},
  }).as('discordGuildCleanupRequest');

  cy.intercept('**/auth/v1/user*', (req) => {
    const body = (req.body as Record<string, unknown>) ?? {};
    updateUserBodies.push(body);

    if (typeof body.email === 'string') {
      account.email = body.email.toLowerCase();
    }

    if (typeof body.password === 'string') {
      account.password = body.password;
    }

    req.reply({
      statusCode: 200,
      body: {
        user: {
          id: account.userId,
          email: account.email,
        },
      },
    });
  }).as('updateUserRequest');

  cy.intercept('GET', '**/rest/v1/games*', {
    statusCode: 200,
    body: [],
  }).as('gamesRequest');

  cy.intercept('GET', '**/rest/v1/profile_games*', {
    statusCode: 200,
    body: [],
  }).as('profileGamesRequest');

  cy.intercept('GET', '**/rest/v1/favorite_games*', {
    statusCode: 200,
    body: [],
  }).as('favoriteGamesRequest');

  cy.intercept('GET', '**/rest/v1/roulette_pool_entries*', {
    statusCode: 200,
    body: [],
  }).as('rouletteRequest');

  cy.intercept('GET', '**/rest/v1/friends*', {
    statusCode: 200,
    body: [],
  }).as('friendsRequest');

  cy.intercept('GET', '**/rest/v1/friend_requests*', {
    statusCode: 200,
    body: [],
  }).as('friendRequestsRequest');

  cy.intercept('GET', '**/rest/v1/lobbies*', {
    statusCode: 200,
    body: [],
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', {
    statusCode: 200,
    body: null,
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', {
    statusCode: 200,
    body: [],
  }).as('availabilityWindowsRequest');
};

describe('account settings', () => {
  const account = makeAccount(
    `cypress-account-${Date.now()}@example.com`,
    `Password123!${Date.now()}`,
  );

  before(() => {
    authStore.clear();
  });

  beforeEach(() => {
    authStore.clear();
    profileUpdateBodies.length = 0;
    updateUserBodies.length = 0;
    account.profile = {
      ...account.profile,
      username: account.email.split('@')[0].toLowerCase(),
      friend_code: makeFriendCode(account.email.split('@')[0].toLowerCase()),
      display_name: 'Test Pilot',
      avatar_url: null,
      onboarding_complete: true,
      birthday_month: null,
      birthday_day: null,
      birthday_visibility: 'private',
      busy_visibility: 'public',
      primary_community_id: null,
      discord_user_id: `discord-${account.userId}`,
      discord_username: 'Test Pilot',
      discord_avatar_url: null,
      discord_connected_at: account.profile.discord_connected_at ?? new Date().toISOString(),
    };
    registerMockAccountSettings(account);
  });

  const signInAndOpenProfile = () => {
    cy.visit('/');
    cy.signupUi(account.email, account.password);
    cy.contains(/^Profile$/).click();
    cy.contains(/profile & settings/i).should('be.visible');
  };

  it('saves edited profile details and sends the expected profile payload', () => {
    signInAndOpenProfile();

    replaceTextInputValue('[data-testid="profile-edit-username-input"]', account.profile.username, 'proplayer');
    replaceTextInputValue('[data-testid="profile-edit-display-name-input"]', account.profile.display_name, 'Pro Player');
    replaceTextInputValue('[data-testid="profile-edit-avatar-url-input"]', account.profile.avatar_url ?? '', 'https://example.com/avatar.png');
    cy.get('[data-testid="profile-edit-save-button"]').click();

    cy.wait('@profileUpdateRequest')
      .its('request.body')
      .should((body) => {
        expect(body.username).to.equal('proplayer');
        expect(body.display_name).to.equal('Pro Player');
        expect(body.avatar_url).to.equal('https://example.com/avatar.png');
        expect(body.birthday_month).to.equal(null);
        expect(body.birthday_day).to.equal(null);
        expect(body.birthday_visibility).to.equal('private');
        expect(body.busy_visibility).to.equal('public');
        expect(body.onboarding_complete).to.equal(true);
      });

    cy.contains(/profile saved/i).should('be.visible');
    cy.get('[data-testid="profile-chip"]').should('contain', 'Pro Player');
    cy.get('[data-testid="profile-edit-username-input"]').should('have.value', 'proplayer');
  });

  it('updates email through the auth API without exposing passwords', () => {
    signInAndOpenProfile();

    const nextEmail = `updated-${Date.now()}@example.com`;
    cy.get('[data-testid="account-email-input"]').clear().type(nextEmail);
    cy.get('[data-testid="account-email-save-button"]').click();

    cy.wait('@updateUserRequest')
      .its('request.body')
      .should((body) => {
        expect(body.email).to.equal(nextEmail);
        expect(body.password).to.equal(undefined);
      });

    cy.contains(/email update requested/i).should('be.visible');
  });

  it('validates password changes locally and then sends the password update request', () => {
    signInAndOpenProfile();

    cy.get('[data-testid="account-password-input"]').type('Mismatch123!');
    cy.get('[data-testid="account-password-confirm-input"]').type('Mismatch456!');
    cy.get('[data-testid="account-password-save-button"]').click();

    cy.contains(/passwords do not match/i).should('be.visible');
    cy.wrap(null).then(() => {
      expect(updateUserBodies).to.have.length(0);
    });

    cy.get('[data-testid="account-password-input"]').clear().type('BetterPass123!');
    cy.get('[data-testid="account-password-confirm-input"]').clear().type('BetterPass123!');
    cy.get('[data-testid="account-password-save-button"]').click();

    cy.wait('@updateUserRequest')
      .its('request.body')
      .should((body) => {
        expect(body.password).to.equal('BetterPass123!');
        expect(body.email).to.equal(undefined);
      });

    cy.contains(/password updated/i).should('be.visible');
    cy.get('[data-testid="account-password-input"]').should('have.value', '');
    cy.get('[data-testid="account-password-confirm-input"]').should('have.value', '');
  });

  it('shows disconnect-only Discord actions for linked users and returns to Connect after disconnect', () => {
    signInAndOpenProfile();

    cy.contains(/^Discord$/).should('be.visible');
    cy.get('[data-testid="discord-disconnect-button"]').should('be.visible');
    cy.get('[data-testid="discord-refresh-servers-button"]').should('not.exist');

    cy.get('[data-testid="discord-disconnect-button"]').click();

    cy.wait('@profileUpdateRequest')
      .its('request.body')
      .should((body) => {
        expect(body.discord_user_id).to.equal(null);
        expect(body.discord_username).to.equal(null);
        expect(body.discord_avatar_url).to.equal(null);
        expect(body.discord_connected_at).to.equal(null);
      });

    cy.wait('@discordGuildCleanupRequest');
    cy.contains(/^Not connected$/).should('be.visible');
    cy.get('[data-testid="discord-connect-button"]').should('be.visible');
  });

  it('cleans oauth redirect params out of the URL query on load', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/?error=access_denied&error_description=Denied');

    cy.location('search').should('eq', '');
    cy.location('href').should('not.include', 'error=');
    cy.contains(/friend management app/i).should('be.visible');
  });
});

export {};
