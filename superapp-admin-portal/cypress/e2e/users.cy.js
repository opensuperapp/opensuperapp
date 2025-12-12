describe('Users page (placeholder)', () => {
    it('shows login until authenticated (placeholder)', () => {
        cy.visit('/users');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
});
