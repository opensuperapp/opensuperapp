/// <reference types="cypress" />

describe('MicroApps RBAC - limited roles hide/disable actions', () => {
  it('with non-admin roles, actions are disabled', () => {
    cy.fixture('microapps-paged.json').then((data) => {
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
    });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        // Only read-only role
        win.localStorage.setItem('e2e-roles', 'microapps:read');
      },
    });

    cy.wait('@getMicroApps');

    // Open actions for first card
    cy.get('[data-testid="microapp-actions-"]').should('not.exist'); // ensure test selector pattern is data-based per appId
    cy.get('[data-testid="microapp-card"]').first().within(() => {
      cy.get('[data-testid^="microapp-actions-"]').click();
    });

    // All management actions should be disabled
    cy.get('[role="menu"]').within(() => {
      cy.get('[data-testid="microapp-menu-edit"]').should('have.attr', 'aria-disabled', 'true');
      cy.get('[data-testid="microapp-menu-add-version"]').should('have.attr', 'aria-disabled', 'true');
      cy.get('[data-testid="microapp-menu-delete"]').should('have.attr', 'aria-disabled', 'true');
      cy.get('[data-testid^="microapp-menu-"]').filter('[data-testid$="deactivate"], [data-testid$="reactivate"]').should('have.attr', 'aria-disabled', 'true');
    });
  });

  it('with admin role, actions are enabled', () => {
    cy.fixture('microapps-paged.json').then((data) => {
      cy.intercept('GET', '/api/micro-apps', { statusCode: 200, body: data }).as('getMicroApps');
    });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        win.localStorage.setItem('e2e-roles', 'admin');
      },
    });

    cy.wait('@getMicroApps');

    cy.get('[data-testid="microapp-card"]').first().within(() => {
      cy.get('[data-testid^="microapp-actions-"]').click();
    });

    cy.get('[role="menu"]').within(() => {
      cy.get('[data-testid="microapp-menu-edit"]').should('not.have.attr', 'aria-disabled');
      cy.get('[data-testid="microapp-menu-add-version"]').should('not.have.attr', 'aria-disabled');
      cy.get('[data-testid="microapp-menu-delete"]').should('not.have.attr', 'aria-disabled');
      cy.get('[data-testid^="microapp-menu-"]').filter('[data-testid$="deactivate"], [data-testid$="reactivate"]').should('not.have.attr', 'aria-disabled');
    });
  });
});
