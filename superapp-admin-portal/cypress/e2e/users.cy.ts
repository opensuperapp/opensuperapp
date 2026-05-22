describe('Users page (placeholder)', () => {
  it('shows login when unauthenticated', () => {
    cy.visit('/users');
    cy.contains('Sign In').should('exist');
  });

  it('renders users table when authenticated (bypass)', () => {
    cy.fixture('users.json').then((data) => {
      cy.intercept('GET', '/api/users', { statusCode: 200, body: data }).as('getUsers');
    });
    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.wait('@getUsers');
    cy.contains('Sign In').should('not.exist');
    cy.get('[data-testid="users-table"]').should('exist');
  });
});
