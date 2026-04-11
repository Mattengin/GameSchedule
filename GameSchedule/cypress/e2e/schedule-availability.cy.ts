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

type MockAvailabilitySlot = {
  profile_id: string;
  day_key: string;
  slot_label: string;
};

const authStore = new Map<string, MockAccount>();
const availabilitySettingsStore = new Map<string, MockAvailabilitySetting>();
const availabilitySlotsStore = new Map<string, MockAvailabilitySlot[]>();

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

const registerMockSchedule = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = makeAccount(email, password);

    authStore.set(account.userId, account);
    availabilitySettingsStore.set(account.userId, {
      profile_id: account.userId,
      auto_decline_outside_hours: false,
    });
    availabilitySlotsStore.set(account.userId, []);

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

  cy.intercept('GET', '**/rest/v1/lobbies*', {
    statusCode: 200,
    body: [],
  }).as('lobbiesRequest');

  cy.intercept('GET', '**/rest/v1/availability_settings*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    req.reply({
      statusCode: 200,
      body: availabilitySettingsStore.get(userId) ?? null,
    });
  }).as('availabilitySettingsRequest');

  cy.intercept('GET', '**/rest/v1/availability_slots*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    req.reply({
      statusCode: 200,
      body: availabilitySlotsStore.get(userId) ?? [],
    });
  }).as('availabilitySlotsRequest');

  cy.intercept('POST', '**/rest/v1/availability_settings*', (req) => {
    const body = req.body as MockAvailabilitySetting & { updated_at?: string };
    availabilitySettingsStore.set(body.profile_id, {
      profile_id: body.profile_id,
      auto_decline_outside_hours: body.auto_decline_outside_hours,
    });
    req.reply({
      statusCode: 201,
      body: body,
    });
  }).as('availabilitySettingsUpsert');

  cy.intercept('DELETE', '**/rest/v1/availability_slots*', (req) => {
    const userId = getQueryValue(req.url, 'profile_id');
    availabilitySlotsStore.set(userId, []);
    req.reply({
      statusCode: 204,
      body: {},
    });
  }).as('availabilitySlotsDelete');

  cy.intercept('POST', '**/rest/v1/availability_slots*', (req) => {
    const body = req.body as MockAvailabilitySlot[];
    const userId = body[0]?.profile_id ?? '';
    availabilitySlotsStore.set(userId, body);
    req.reply({
      statusCode: 201,
      body,
    });
  }).as('availabilitySlotsInsert');
};

describe('schedule and availability', () => {
  const email = `cypress-schedule-${Date.now()}@example.com`;
  const password = `Password123!${Date.now()}`;

  before(() => {
    authStore.clear();
    availabilitySettingsStore.clear();
    availabilitySlotsStore.clear();
  });

  beforeEach(() => {
    registerMockSchedule();
  });

  it('saves selected availability slots and the auto-decline preference', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.contains('Schedule').click();
    cy.get('[data-testid="availability-slot-mon-6-pm"]').click();
    cy.get('[data-testid="availability-slot-wed-8-pm"]').click();
    cy.contains(/^Auto-decline outside hours$/).click();
    cy.get('[data-testid="availability-count-chip"]').should('contain', '2 saved slots');
    cy.get('[data-testid="save-availability-button"]').click();

    cy.contains(/availability saved/i).should('be.visible');
  });

  it('loads saved availability from the mocked backend on refresh', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.contains('Schedule').click();
    cy.get('[data-testid="availability-slot-fri-10-pm"]').click();
    cy.get('[data-testid="save-availability-button"]').click();
    cy.contains(/availability saved/i).should('be.visible');

    cy.reload();
    cy.contains('Schedule').click();
    cy.get('[data-testid="availability-count-chip"]').should('contain', '1 saved slot');
  });
});
