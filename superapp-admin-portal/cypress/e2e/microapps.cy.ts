describe('MicroApps page (placeholder)', () => {
  it('shows login until authenticated (placeholder)', () => {
    cy.visit('/');
    cy.findByRole('button', { name: /sign in/i }).should('exist');
  });
});
