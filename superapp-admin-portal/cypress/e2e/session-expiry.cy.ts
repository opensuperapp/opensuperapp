describe('Session expiry', () => {
  it('redirects to login after idle timeout (simulated by clearing auth flag)', () => {
    // Allow initial data fetch
    cy.fixture('microapps.json').then((data) => {
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
    });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.wait('@getMicroApps');

    // Should be authenticated view (no Sign In button)
    cy.findByRole('button', { name: /sign in/i }).should('not.exist');

    // Simulate idle timeout by clearing bypass flag, then reload app
    cy.window().then((win) => win.localStorage.removeItem('e2e-auth'));
    cy.reload();

    // Now login page should be shown
    cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
    cy.findByRole('button', { name: /sign in/i }).should('exist');
  });

  it('redirects to login when token expires (simulated 401)', () => {
    // Set auth bypass and then force a protected API to return 401
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.intercept('GET', '/api/micro-apps', { statusCode: 401, body: { message: 'Unauthorized' } }).as('getMicroApps401');

    // Trigger initial load which will hit the 401
    cy.wait('@getMicroApps401');

    // App should sign out and show login UI
    cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
    cy.findByRole('button', { name: /sign in/i }).should('exist');

    // Confirm bypass flag cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('e2e-auth')).to.be.null;
    });
  });
});
