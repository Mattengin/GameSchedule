describe('auth screen', () => {
  const mobileSafariUserAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

  it('still starts Discord OAuth on desktop web', () => {
    cy.intercept('GET', '**/auth/v1/authorize*', (req) => {
      expect(req.url).to.include('provider=discord');
      expect(req.url).to.include('redirect_to=http%3A%2F%2Flocalhost%3A8082%2FGameSchedule%2F');
      req.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
        body: '<html><body>discord auth handoff</body></html>',
      });
    }).as('discordAuthorize');

    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'open').as('windowOpen');
      },
    });

    cy.contains(discordMobileHint()).should('not.exist');
    cy.get('[data-testid="discord-login-button"]').click();
    cy.wait('@discordAuthorize');
    cy.get('@windowOpen').should('not.have.been.called');
  });

  it('uses best-effort same-tab handoff on phone browsers', () => {
    cy.viewport('iphone-8');
    cy.intercept('GET', '**/auth/v1/authorize*', (req) => {
      expect(req.url).to.include('provider=discord');
      expect(req.url).to.include('redirect_to=http%3A%2F%2Flocalhost%3A8082%2FGameSchedule%2F');
      req.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
        body: '<html><body>discord auth handoff</body></html>',
      });
    }).as('discordAuthorize');

    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'open').as('windowOpen');
        Object.defineProperty(win.navigator, 'userAgent', {
          value: mobileSafariUserAgent,
          configurable: true,
        });
      },
    });

    cy.contains(discordMobileHint()).should('be.visible');
    cy.get('[data-testid="discord-login-button"]').click();
    cy.wait('@discordAuthorize');
    cy.get('@windowOpen').should('not.have.been.called');
  });
});

function discordMobileHint() {
  return "On phones, we'll try to hand off to Discord. If your browser keeps you on the web, continue there.";
}

export {};
