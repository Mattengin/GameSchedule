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

type MockAvailabilitySetting = {
  profile_id: string;
  auto_decline_outside_hours: boolean;
};

type MockAvailabilityWindow = {
  id: string;
  profile_id: string;
  day_key: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type MockLobby = {
  id: string;
  title: string;
  scheduled_for: string | null;
  scheduled_until: string | null;
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
};

const authStore = new Map<string, MockAccount>();
const availabilitySettingsStore = new Map<string, MockAvailabilitySetting>();
const availabilityWindowsStore = new Map<string, MockAvailabilityWindow[]>();
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

const makeLobby = (account: MockAccount, endBeforeStart = false): MockLobby => {
  const startDate = new Date();
  startDate.setHours(20, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(endBeforeStart ? 19 : 22, 0, 0, 0);

  return {
    id: endBeforeStart ? 'lobby-invalid-time' : 'lobby-schedule-1',
    title: endBeforeStart ? 'Invalid Time Lobby' : 'Helix Arena Ranked',
    scheduled_for: startDate.toISOString(),
    scheduled_until: endDate.toISOString(),
    is_private: true,
    status: 'scheduled',
    game_id: 'helix-arena',
    host_profile_id: account.userId,
    games: {
      id: 'helix-arena',
      title: 'Helix Arena',
      genre: 'Hero Shooter',
      platform: 'PC / Console',
      player_count: '3-5 players',
    },
  };
};

const registerMockSchedule = (options: { invalidLobbyTime?: boolean } = {}) => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = makeAccount(email, password);

    authStore.set(account.userId, account);
    availabilitySettingsStore.set(account.userId, {
      profile_id: account.userId,
      auto_decline_outside_hours: false,
    });
    availabilityWindowsStore.set(account.userId, []);
    lobbyStore.set(account.userId, [makeLobby(account, options.invalidLobbyTime)]);

    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

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
    body: [],
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

    req.reply({
      statusCode: 200,
      body: lobbyStore.get(userId) ?? [],
    });
  }).as('lobbiesRequest');

  cy.intercept('PATCH', '**/rest/v1/lobbies*', (req) => {
    const account = Array.from(authStore.values())[0];
    const userId = account?.userId ?? '';
    const lobbyId = getQueryValue(req.url, 'id');
    const body = req.body as {
      scheduled_for: string;
      scheduled_until: string;
    };
    const current = lobbyStore.get(userId) ?? [];
    const updated = current.map((lobby) =>
      lobby.id === lobbyId
        ? {
            ...lobby,
            scheduled_for: body.scheduled_for,
            scheduled_until: body.scheduled_until,
          }
        : lobby,
    );

    lobbyStore.set(userId, updated);

    req.reply({
      statusCode: 200,
      body: updated.find((lobby) => lobby.id === lobbyId) ?? updated[0],
    });
  }).as('rescheduleLobbyRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    req.reply({
      statusCode: 200,
      body: availabilitySettingsStore.get(userId) ?? null,
    });
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_windows*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    req.reply({
      statusCode: 200,
      body: availabilityWindowsStore.get(userId) ?? [],
    });
  }).as('availabilityWindowsRequest');

  cy.intercept('POST', '**/rest/v1/availability_settings*', (req) => {
    const body = req.body as MockAvailabilitySetting & { updated_at?: string };
    availabilitySettingsStore.set(body.profile_id, {
      profile_id: body.profile_id,
      auto_decline_outside_hours: body.auto_decline_outside_hours,
    });
    req.reply({
      statusCode: 201,
      body,
    });
  }).as('availabilitySettingsUpsert');

  cy.intercept('POST', '**/rest/v1/availability_windows*', (req) => {
    const body = req.body as Omit<MockAvailabilityWindow, 'id' | 'created_at'>;
    const window: MockAvailabilityWindow = {
      ...body,
      id: `availability-window-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const current = availabilityWindowsStore.get(body.profile_id) ?? [];

    availabilityWindowsStore.set(body.profile_id, [...current, window]);

    req.reply({
      statusCode: 201,
      body: window,
    });
  }).as('availabilityWindowsInsert');

  cy.intercept('DELETE', '**/rest/v1/availability_windows*', {
    statusCode: 204,
    body: {},
  }).as('availabilityWindowsDelete');
};

describe('schedule and availability', () => {
  const email = `cypress-schedule-${Date.now()}@example.com`;
  const password = `Password123!${Date.now()}`;

  before(() => {
    authStore.clear();
    availabilitySettingsStore.clear();
    availabilityWindowsStore.clear();
    lobbyStore.clear();
  });

  beforeEach(() => {
    registerMockSchedule();
  });

  it('reschedules a lobby with a persisted end time', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.contains('Schedule').click();
    cy.contains('Helix Arena Ranked').should('be.visible');
    cy.get('[data-testid="schedule-edit-lobby-lobby-schedule-1"]').click();
    cy.get('[data-testid="schedule-lobby-start-lobby-schedule-1"]').should('contain', 'Start:');
    cy.get('[data-testid="schedule-lobby-end-lobby-schedule-1"]').should('contain', 'End:');
    cy.get('[data-testid="schedule-save-lobby-lobby-schedule-1"]').click();

    cy.wait('@rescheduleLobbyRequest')
      .its('request.body')
      .should((body) => {
        expect(body.scheduled_for).to.be.a('string');
        expect(body.scheduled_until).to.be.a('string');
        expect(new Date(body.scheduled_until).getTime()).to.be.greaterThan(
          new Date(body.scheduled_for).getTime(),
        );
      });
    cy.contains(/lobby time updated/i).should('be.visible');
  });

  it('adds and deletes a recurring availability window', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.contains('Schedule').click();
    cy.contains(/^Mon$/).click();
    cy.get('[data-testid="availability-start-time-button"]').should('contain', 'Start:');
    cy.get('[data-testid="availability-end-time-button"]').should('contain', 'End:');
    cy.get('[data-testid="add-availability-window-button"]').click();

    cy.wait('@availabilityWindowsInsert')
      .its('request.body')
      .should((body) => {
        expect(body.day_key).to.equal('Mon');
        expect(body.starts_at).to.equal('20:00:00');
        expect(body.ends_at).to.equal('22:00:00');
      });
    cy.contains(/availability window added/i).should('be.visible');
    cy.contains('8:00 PM - 10:00 PM').should('be.visible');

    cy.get('[data-testid="delete-availability-window-0"]').click();
    cy.wait('@availabilityWindowsDelete');
    cy.contains(/availability window removed/i).should('be.visible');
  });

  it('validates that a lobby end time must be after its start time', () => {
    registerMockSchedule({ invalidLobbyTime: true });
    cy.visit('/');
    cy.signupUi(email, password);
    cy.wait('@lobbiesRequest');
    cy.contains('Schedule').click();
    cy.get('[data-testid="schedule-edit-lobby-lobby-invalid-time"]').click();
    cy.get('[data-testid="schedule-save-lobby-lobby-invalid-time"]').click();

    cy.contains(/pick an end time after the start time/i).should('be.visible');
  });
});

export {};
