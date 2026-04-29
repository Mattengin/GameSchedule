describe('profile onboarding', () => {
  const signupEnabled = Cypress.env('signupEnabled') === true;
  const signupPassword = Cypress.env('signupPassword') || 'Password123!';

  before(function () {
    if (!signupEnabled) {
      cy.log('Skipping profile onboarding tests because signupEnabled was not set to true.');
      this.skip();
    }
  });

  it('shows a Home onboarding notice and routes incomplete users to Profile setup', () => {
    const uniqueEmail = `cypress-profile-${Date.now()}@example.com`;

    cy.visit('/');
    cy.signupUi(uniqueEmail, signupPassword);

    cy.get('[data-testid="profile-chip"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="home-onboarding-notice"]', { timeout: 15000 }).should('be.visible');
    cy.contains(/setup wizard/i).should('not.exist');
    cy.get('[data-testid="home-complete-setup-button"]').click();
    cy.get('[data-testid="profile-onboarding-card"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-username-input"]').should('be.visible');
    cy.get('[data-testid="profile-display-name-input"]').should('be.visible');
    cy.get('[data-testid="profile-save-button"]').should('be.visible');
    cy.contains(/^Profile details$/).should('not.exist');
  });

  it('validates required fields before saving', () => {
    const uniqueEmail = `cypress-profile-validate-${Date.now()}@example.com`;

    cy.visit('/');
    cy.signupUi(uniqueEmail, signupPassword);

    cy.get('[data-testid="home-complete-setup-button"]', { timeout: 15000 }).click();
    cy.get('[data-testid="profile-onboarding-card"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-username-input"]', { timeout: 15000 }).clear();
    cy.get('[data-testid="profile-display-name-input"]').clear();
    cy.get('[data-testid="profile-save-button"]').click();

    cy.contains(/username and display name are required/i).should('be.visible');
    cy.get('[data-testid="profile-onboarding-card"]').should('be.visible');
  });

  it('saves the profile and marks onboarding complete', () => {
    const uniqueEmail = `cypress-profile-save-${Date.now()}@example.com`;
    const username = `player${Date.now()}`;
    const displayName = 'Cypress Player';

    cy.visit('/');
    cy.signupUi(uniqueEmail, signupPassword);

    cy.get('[data-testid="home-complete-setup-button"]', { timeout: 15000 }).click();
    cy.get('[data-testid="profile-onboarding-card"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-username-input"]', { timeout: 15000 }).clear().type(username);
    cy.get('[data-testid="profile-display-name-input"]').clear().type(displayName);
    cy.get('[data-testid="profile-avatar-url-input"]').clear().type('https://example.com/avatar.png');
    cy.get('[data-testid="profile-save-button"]').click();

    cy.contains(/profile saved/i, { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="profile-username-input"]').should('not.exist');
    cy.get('[data-testid="profile-onboarding-card"]').should('not.exist');
    cy.contains(/^Profile details$/).should('be.visible');
    cy.get('[data-testid="profile-chip"]').click();
    cy.get('[data-testid="account-menu-identity-name"]').should('contain.text', displayName);

    cy.contains(/^Home$/).click();
    cy.get('[data-testid="home-onboarding-notice"]').should('not.exist');
    cy.contains(/setup wizard/i).should('not.exist');
  });
});

export {};
