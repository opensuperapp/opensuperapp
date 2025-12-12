describe('401 handling', () => {
    it('signs out and shows login when API returns 401', () => {
        // Intercept an API call and force 401
        cy.intercept('GET', '/api/micro-apps', {
            statusCode: 401,
            body: { message: 'Unauthorized' },
        }).as('getMicroApps401');
        // Set auth bypass in the AUT before it loads so useAuth picks it up
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
        // App should detect 401, sign out (clearing e2e-auth), and show login UI
        cy.wait('@getMicroApps401');
        cy.findByRole('heading', { name: /superapp admin portal/i }).should('exist');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
        // Confirm bypass flag removed in AUT window
        cy.window().then((win) => {
            expect(win.localStorage.getItem('e2e-auth')).to.be.null;
        });
    });
});
