describe('games library', () => {
  const email = Cypress.env('testEmail');
  const password = Cypress.env('testPassword');

  before(function () {
    if (!email || !password) {
      cy.log('Skipping games library tests because testEmail/testPassword were not provided.');
      this.skip();
    }
  });

  const openGamesSection = () => {
    cy.contains('Games').click();
    cy.contains(/supabase-backed library/i).should('be.visible');
  };

  it('loads seeded games from the library after sign in', () => {
    cy.visit('/');
    cy.loginUi(email, password);

    openGamesSection();
    cy.contains('Helix Arena').should('be.visible');
    cy.contains('Deep Raid').should('be.visible');
    cy.contains('Wild Rally Online').should('be.visible');
    cy.contains(/results/i).should('be.visible');
  });

  it('filters games by search term', () => {
    cy.visit('/');
    cy.loginUi(email, password);

    openGamesSection();
    cy.get('[data-testid="games-search-input"]').clear().type('extraction');

    cy.contains('Deep Raid').should('be.visible');
    cy.contains('Helix Arena').should('not.exist');
    cy.contains('Wild Rally Online').should('not.exist');
  });

  it('shows an empty state when no games match the search', () => {
    cy.visit('/');
    cy.loginUi(email, password);

    openGamesSection();
    cy.get('[data-testid="games-search-input"]').clear().type('zzznomatchzzz');

    cy.get('[data-testid="games-empty-state"]').should('be.visible');
    cy.contains(/no games matched your search/i).should('be.visible');
  });
});
