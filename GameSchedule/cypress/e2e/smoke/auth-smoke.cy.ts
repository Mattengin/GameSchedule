describe('auth screen', () => {
  it('shows the sign-in form', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'open').as('windowOpen');
      },
    });

    cy.contains('Friend Management App').should('be.visible');
    cy.contains('Sign in').should('be.visible');
    cy.contains(/^Sign in with Discord or use email and password\.$/).should('be.visible');
    cy.contains(
      /discord is optional\. if you connect it, the app uses your discord identity for sign-in and profile matching\./i,
    ).should('be.visible');
    cy.get('[data-testid="auth-email-input"]').should('exist');
    cy.get('[data-testid="auth-password-input"]').should('exist');
    cy.get('[data-testid="auth-password-confirm-input"]').should('not.exist');
    cy.get('[data-testid="auth-submit-button"]').should('be.visible');
    cy.contains(/^Privacy policy$/i).click();
    cy.get('@windowOpen').should('have.been.calledWithMatch', /privacy-policy/);
    cy.contains(/^Contact support$/i).should('not.exist');
    cy.contains(/fallback: use email\/password/i).should('not.exist');
    cy.contains(/use an existing supabase user to sign in/i).should('not.exist');
  });

  it('shows an error on invalid credentials', () => {
    cy.visit('/');

    cy.loginUi('wrong@example.com', 'wrong-password');
    cy.contains(/invalid login credentials|authentication failed|invalid/i, {
      timeout: 10000,
    }).should('be.visible');
  });

  it('requires matching passwords before creating an account', () => {
    cy.visit('/');

    cy.contains(/^sign up$/i).click();
    cy.get('[data-testid="auth-password-confirm-input"]').should('be.visible');
    cy.get('[data-testid="auth-submit-button"]').should('be.disabled');

    cy.get('[data-testid="auth-email-input"]').type('signup-mismatch@example.com');
    cy.get('[data-testid="auth-password-input"]').type('Password123!', { log: false });
    cy.get('[data-testid="auth-password-confirm-input"]').type('Password321!', { log: false });
    cy.contains(/^Passwords do not match\.$/).should('be.visible');
    cy.get('[data-testid="auth-submit-button"]').should('be.disabled');

    cy.get('[data-testid="auth-password-confirm-input"]').clear().type('Password123!', { log: false });
    cy.contains(/^Passwords do not match\.$/).should('not.exist');
    cy.get('[data-testid="auth-submit-button"]').should('not.be.disabled');
  });
});

export {};
