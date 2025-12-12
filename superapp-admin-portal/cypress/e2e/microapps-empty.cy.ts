/// <reference types="cypress" />

describe('MicroApps empty state', () => {
  it('shows empty state when API returns []', () => {
    cy.intercept('GET', '**/api/micro-apps*', []).as('getMicroApps');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.wait('@getMicroApps');

    cy.contains('No Micro Apps Yet').should('be.visible');
    cy.contains('Add Your First App').should('be.visible');
    cy.get('[data-testid="microapps-grid"]').should('not.exist');
  });
});
