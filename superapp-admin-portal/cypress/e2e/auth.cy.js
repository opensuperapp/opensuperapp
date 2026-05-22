describe('Auth flow (stubbed)', () => {
    it('shows login page when unauthenticated', () => {
        cy.visit('/');
        cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
});
