/// <reference types="cypress" />

describe('MicroApps - loading skeletons', () => {
  it('shows skeletons while request in-flight, then hides after resolve', () => {
    // Delay GET to show skeleton
    cy.intercept('GET', '/api/micro-apps', (req) => {
      // hold the response until we explicitly send it
      // We'll use a promise to delay
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          req.reply({ fixture: 'microapps.json' });
          resolve();
        }, 800);
      });
    }).as('getMicroApps');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    // While waiting, skeleton container and cards should exist
    cy.get('[data-testid="microapps-skeleton"]').should('be.visible');
    cy.get('[data-testid="microapp-skeleton-card"]').should('have.length.at.least', 3);

    // After the response, skeletons disappear and grid renders
    cy.wait('@getMicroApps');
    cy.get('[data-testid="microapps-skeleton"]').should('not.exist');
    cy.get('[data-testid="microapps-grid"]').should('exist');
  });
});
