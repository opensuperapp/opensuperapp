describe('Protected routes', () => {
    it('redirects unauthenticated visits to login for / and /users', () => {
        // Ensure not authenticated
        cy.visit('/');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
        cy.visit('/users');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
    it('renders content when auth bypass is on', () => {
        // MicroApps: intercept success and confirm content renders
        cy.fixture('microapps.json').then((data) => {
            cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
        });
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
        cy.wait('@getMicroApps');
        // With content loaded, login button should not exist
        cy.findByRole('button', { name: /sign in/i }).should('not.exist');
        // Users: intercept success and confirm content renders
        cy.fixture('users.json').then((data) => {
            cy.intercept('GET', '/api/users', { statusCode: 200, body: data }).as('getUsers');
        });
        cy.visit('/users', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
        cy.wait('@getUsers');
        cy.findByRole('button', { name: /sign in/i }).should('not.exist');
    });
});
