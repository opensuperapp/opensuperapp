describe('Auth flow (stubbed)', () => {
  it('shows login page when unauthenticated', () => {
    cy.visit('/');
    cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
    cy.findByRole('button', { name: /sign in/i }).should('exist');
  });

  it('renders content when authenticated via bypass + intercept', () => {
    cy.fixture('microapps.json').then((data) => {
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
    });
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.wait('@getMicroApps');
    cy.findByRole('button', { name: /sign in/i }).should('not.exist');
  });
});
