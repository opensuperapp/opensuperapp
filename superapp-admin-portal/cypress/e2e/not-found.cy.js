describe('Not Found (404)', () => {
    it('shows login for unknown route when unauthenticated', () => {
        cy.visit('/this-route-does-not-exist');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
    it('shows Not Found page for unknown route when authenticated (bypass)', () => {
        cy.visit('/totally-unknown', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
        cy.findByRole('heading', { name: /page not found/i }).should('exist');
        cy.findByRole('link', { name: /go home/i }).should('exist').click();
    });
});
