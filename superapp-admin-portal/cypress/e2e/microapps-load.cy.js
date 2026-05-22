describe('MicroApps list: load and render', () => {
    it('intercepts GET /api/micro-apps and verifies cards, icons, and grid layout', () => {
        cy.fixture('microapps-paged.json').then((data) => {
            cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
        });
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
        cy.wait('@getMicroApps');
        // Expect multiple cards rendered
        cy.get('[data-testid="microapp-card"]').should('have.length.at.least', 6);
        // Check avatar icons and titles on first few cards
        cy.get('[data-testid="microapp-card"]').first().within(() => {
            cy.findByRole('img', { name: /app 1/i }).should('exist');
            cy.findByText(/app 1/i).should('exist');
        });
        // Grid layout responsive container exists
        cy.get('[data-testid="microapps-grid"]').should('exist');
    });
});
