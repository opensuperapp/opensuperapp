describe('Navigation', () => {
  it('shows login by default when unauthenticated', () => {
    cy.visit('/');
    cy.contains('Sign In').should('exist');
  });

  it('shows app shell after auth bypass + intercept', () => {
    cy.fixture('microapps.json').then((data) => {
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
    });
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.wait('@getMicroApps');
    cy.contains('Sign In').should('not.exist');
  });
});
