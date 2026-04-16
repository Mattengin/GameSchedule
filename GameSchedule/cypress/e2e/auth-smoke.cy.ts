describe('auth screen', () => {
  it('shows the sign-in form', () => {
    cy.visit('/');

    cy.contains('Friend Management App').should('be.visible');
    cy.contains('Sign in').should('be.visible');
    cy.get('[data-testid="auth-email-input"]').should('exist');
    cy.get('[data-testid="auth-password-input"]').should('exist');
    cy.get('[data-testid="auth-submit-button"]').should('be.visible');
  });

  it('shows an error on invalid credentials', () => {
    cy.visit('/');

    cy.loginUi('wrong@example.com', 'wrong-password');
    cy.contains(/invalid login credentials|authentication failed|invalid/i, {
      timeout: 10000,
    }).should('be.visible');
  });
});

export {};
