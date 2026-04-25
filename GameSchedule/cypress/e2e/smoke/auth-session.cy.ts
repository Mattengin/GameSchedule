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
    busy_visibility?: 'private' | 'public';
  };
};

const authStore = new Map<string, MockAccount>();

const makeUserId = (email: string) => {
  return `user-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
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
      avatar_url: null,
      display_name: username,
      onboarding_complete: false,
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

const registerMockAuth = () => {
  cy.intercept('POST', '**/auth/v1/signup', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const account = makeAccount(email, password);

    authStore.set(account.userId, account);
    req.reply({
      statusCode: 200,
      body: makeAuthBody(account),
    });
  }).as('signupRequest');

  cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const userId = makeUserId(email);
    const existingAccount = authStore.get(userId) ?? makeAccount(email, password);
    const account =
      existingAccount.password === password
        ? existingAccount
        : {
            ...existingAccount,
            password,
          };

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
    const idMatch = /id=eq\.([^&]+)/.exec(req.url);
    const userId = idMatch ? decodeURIComponent(idMatch[1]) : '';
    const account = authStore.get(userId);

    req.reply({
      statusCode: 200,
      body: account?.profile ?? null,
    });
  }).as('profileRequest');
};

describe('authenticated session', () => {
  const email = `cypress-auth-session-${Date.now()}@example.com`;
  const password = `Password123!${Date.now()}`;

  beforeEach(() => {
    registerMockAuth();
  });

  before(() => {
    authStore.clear();
  });

  it('signs in and loads the profile-backed app shell', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="logout-button"]').click();
    cy.get('[data-testid="auth-submit-button"]', { timeout: 15000 }).should('be.visible');

    cy.loginUi(email, password);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-summary-card"]', { timeout: 15000 }).should('be.visible');
    cy.contains(/social gaming handoff prototype/i).should('be.visible');
    cy.contains(/welcome back/i).should('be.visible');
  });

  it('logs out back to the auth screen', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="logout-button"]', { timeout: 15000 }).click();
    cy.get('[data-testid="auth-submit-button"]', { timeout: 15000 }).should('be.visible');
    cy.contains(/^sign in$/i).should('be.visible');
  });

  it('restores the session after refresh', () => {
    cy.visit('/');
    cy.signupUi(email, password);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.reload();
    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-summary-card"]').should('be.visible');
  });

  it('creates a profile on first sign up', () => {
    const uniqueEmail = `cypress+${Date.now()}@example.com`;
    const signupPassword = `Password123!${Date.now()}`;

    cy.visit('/');
    cy.signupUi(uniqueEmail, signupPassword);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-summary-card"]', { timeout: 15000 }).within(() => {
      cy.contains(/welcome back/i).should('be.visible');
      cy.contains(/username:/i).should('be.visible');
      cy.contains(/onboarding: in progress/i).should('be.visible');
    });
  });
});

export {};
