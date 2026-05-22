/// <reference types="cypress" />

describe('Users empty state', () => {
  it('shows empty state when API returns []', () => {
    // Prevent noise from MicroApps initial load
    cy.intercept('GET', '**/api/micro-apps*', []).as('getMicroApps');
    cy.intercept('GET', '**/api/users', []).as('getUsers');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.wait('@getMicroApps');

    cy.contains('Users').click();

    cy.wait('@getUsers');

  cy.contains('No Users Yet').should('be.visible');
  cy.contains('Add First User').should('be.visible');
  // In empty state, the table isn't rendered at all
  cy.get('[data-testid="users-table"]').should('not.exist');
  });
});
