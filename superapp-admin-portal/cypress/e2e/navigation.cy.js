describe('Navigation', () => {
    beforeEach(() => {
        cy.visit('/');
    });
    it('renders login by default and allows basic nav links to be visible after auth (placeholder)', () => {
        // As unauthenticated, we see login; actual navigation requires auth, which is handled by OIDC redirect.
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
});
