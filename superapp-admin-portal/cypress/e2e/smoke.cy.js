describe('Admin portal smoke', () => {
    it('loads login screen', () => {
        cy.visit('/');
        cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
});
