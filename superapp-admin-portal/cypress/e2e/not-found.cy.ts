describe('Not Found (404)', () => {
  it('shows login for unknown route when unauthenticated', () => {
    cy.visit('/this-route-does-not-exist');
  cy.contains('Sign In').should('exist');
  });

  it('shows Not Found page for unknown route when authenticated (bypass)', () => {
    cy.visit('/totally-unknown', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  cy.contains(/page not found/i).should('exist');
  cy.contains(/go home/i).should('exist').click();
  });
});
