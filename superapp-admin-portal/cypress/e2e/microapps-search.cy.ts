describe('MicroApps search with debounce', () => {
  it('debounces requests and filters results', () => {
    cy.fixture('microapps-paged.json').then((data) => {
      // Initial list (no query)
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('initial');

      // Debounced search requests with q param; reply dynamically
      cy.intercept('GET', /\/api\/micro-apps\?q=.*/, (req) => {
        const url = new URL(req.url);
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const filtered = data.filter((a) => a.name.toLowerCase() === q);
        req.reply({ statusCode: 200, body: filtered });
      }).as('searchQ');
    });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.wait('@initial');

    // Type quickly; debounce should collapse multiple keystrokes into one request
    cy.get('[data-testid="microapps-search"]').type('App 1');

    // Wait for the debounced request and ensure only one fired
    cy.wait('@searchQ');
    cy.get('@searchQ.all').should('have.length', 1);

    // Verify the grid now shows the filtered item
    cy.get('[data-testid="microapp-card"]').should('have.length', 1);
    cy.findByText(/app 1/i).should('exist');
  });
});
