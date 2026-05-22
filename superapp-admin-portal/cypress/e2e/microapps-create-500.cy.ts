/// <reference types="cypress" />

// Covers: 500 server error during create should show error toast and leave dialog open

describe('Create MicroApp - server error 500', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    // Seed initial empty list
    cy.intercept('GET', '**/api/micro-apps*', []).as('getApps');
    cy.wait('@getApps');
  });

  it('shows error toast and keeps dialog open on 500', () => {
    // Open Add dialog
    cy.contains('Add Micro App').click();
    cy.contains('Add New Micro App').should('be.visible');

    // Fill basic info quickly
    cy.get('[data-testid="add-app-appId"]').type('com.example.todo');
    cy.get('[data-testid="add-app-name"]').type('ToDo');
    cy.get('[data-testid="add-app-description"]').type('Tasks app');

    // Navigate to Review with bypassed uploads
    cy.get('[data-testid="add-app-next"]').click(); // assets
    cy.get('[data-testid="add-app-next"]').click(); // version
    cy.get('[data-testid="add-app-version"]').type('1.0.0');
    cy.get('[data-testid="add-app-release-notes"]').type('Initial release');
    cy.get('[data-testid="add-app-next"]').click(); // roles
    cy.get('[data-testid="add-app-role-input"]').type('admin');
    cy.get('[data-testid="add-app-add-role"]').click();
    cy.get('[data-testid="add-app-next"]').click(); // review

    // Intercept create with 500 error
    cy.intercept('POST', '**/api/micro-apps', {
      statusCode: 500,
      body: {
        message: 'Internal server error',
      },
    }).as('create500');

    // Attempt to submit
    cy.get('[data-testid="add-app-submit"]').click();
    cy.wait('@create500');

    // Expect error toast visible and dialog still open
    cy.contains('Internal server error').should('be.visible');
    cy.contains('Add New Micro App').should('be.visible');

    // Subsequent attempt with success should close the dialog
    cy.intercept('POST', '**/api/micro-apps', { statusCode: 200 }).as('create200');
    cy.get('[data-testid="add-app-submit"]').click();
    cy.wait('@create200');
    cy.contains('Add New Micro App').should('not.exist');
  });
});
