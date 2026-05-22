describe('Forbidden (403) state rendering', () => {
  beforeEach(() => {
    // Simulate authenticated bypass so app mounts the protected pages
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  });

  it('shows Not authorized on MicroApps when /micro-apps returns 403', () => {
    cy.intercept('GET', '/api/micro-apps', {
      statusCode: 403,
      body: { message: 'Forbidden' },
    }).as('getMicroApps403');

    cy.wait('@getMicroApps403');
  cy.get('[data-testid="forbidden-state"]').should('exist');
  cy.contains(/Not authorized/i).should('exist');

  // Ensure we did not get redirected to login page
  cy.contains('Sign In').should('not.exist');
  });

  it('shows Not authorized on Users when /users returns 403', () => {
    // Navigate to Users page
    cy.intercept('GET', '/api/users', {
      statusCode: 403,
      body: { message: 'Forbidden' },
    }).as('getUsers403');

    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.wait('@getUsers403');
  cy.get('[data-testid="forbidden-state"]').should('exist');
  cy.contains(/Not authorized/i).should('exist');
  cy.contains('Sign In').should('not.exist');
  });
});
