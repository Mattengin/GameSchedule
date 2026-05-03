/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginUi(email: string, password: string): Chainable<void>;
      signupUi(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginUi', (email: string, password: string) => {
  cy.get('[data-testid="auth-email-input"]').clear().type(email);
  cy.get('[data-testid="auth-password-input"]').clear().type(password, { log: false });
  cy.get('[data-testid="auth-submit-button"]').click();
});

Cypress.Commands.add('signupUi', (email: string, password: string) => {
  cy.get('[data-testid="auth-email-input"]').should('exist');
  cy.contains(/^sign up$/i).click();
  cy.get('[data-testid="auth-email-input"]').clear().type(email);
  cy.get('[data-testid="auth-password-input"]').clear().type(password, { log: false });
  cy.get('[data-testid="auth-password-confirm-input"]').clear().type(password, { log: false });
  cy.get('[data-testid="auth-submit-button"]').click();
});

export {};
