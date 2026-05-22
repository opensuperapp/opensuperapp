/// <reference types="cypress" />

// Covers: 400 validation error during create should surface inline errors and keep submit disabled until fixed

describe('Create MicroApp - validation errors', () => {
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

  it('shows inline server errors on 400 and disables submit until fixed', () => {
    // Open Add dialog
    cy.contains('Add Micro App').click();
    cy.contains('Add New Micro App').should('be.visible');

    // Fill basic info
    cy.get('[data-testid="add-app-appId"]').type('com.example.todo');
    cy.get('[data-testid="add-app-name"]').type('ToDo');
    cy.get('[data-testid="add-app-description"]').type('Tasks app');

    // Next: Upload Assets (bypass env will mark success)
    cy.get('[data-testid="add-app-next"]').click();

    // Next: Version Details
    cy.get('[data-testid="add-app-next"]').click();

    // Fill version fields
    cy.get('[data-testid="add-app-version"]').type('1.0.0');
    cy.get('[data-testid="add-app-release-notes"]').type('Initial release');

    // Bypass zip upload by setting zip url via intercept of upload or rely on dev bypass behaviour
    // Proceed to Roles
    cy.get('[data-testid="add-app-next"]').click();

    // Try to submit with no roles: should show roles error and Next disabled until role added
    cy.get('[data-testid="add-app-next"]').click();
    cy.get('[data-testid="add-app-roles-error"]').should('be.visible');

    // Add a role to proceed
    cy.get('[data-testid="add-app-role-input"]').type('admin');
    cy.get('[data-testid="add-app-add-role"]').click();

    // Go to Review
    cy.get('[data-testid="add-app-next"]').click();

    // Intercept create with 400 and field errors
    cy.intercept('POST', '**/api/micro-apps', {
      statusCode: 400,
      body: {
        message: 'Validation failed',
        errors: {
          name: 'Name must be unique',
          version: 'Version already exists',
        },
      },
    }).as('create400');

    // Attempt to submit
    cy.get('[data-testid="add-app-submit"]').click();
    cy.wait('@create400');

    // Inline errors should be visible on their respective steps/fields
    // Go back to Basic Info to see name error
    cy.get('button').contains('Back').click(); // back to Roles
    cy.get('button').contains('Back').click(); // back to Version
    cy.contains('Version is required').should('not.exist');
    // version error might show near version field on step 2 if we persisted error mapping there
    cy.get('[data-testid="add-app-version"]').parent().within(() => {
      cy.contains('Version already exists').should('exist');
    });
    cy.get('button').contains('Back').click(); // back to Assets
    cy.get('button').contains('Back').click(); // back to Basic
    cy.get('[data-testid="add-app-name"]').parent().within(() => {
      cy.contains('Name must be unique').should('exist');
    });

    // Submit should be disabled while errors remain
    cy.get('[data-testid="add-app-next"]').should('be.disabled');

    // Fix errors: change name and version
    cy.get('[data-testid="add-app-name"]').clear().type('Tasks');
    cy.get('button').contains('Next').click(); // assets
    cy.get('button').contains('Next').click(); // version
    cy.get('[data-testid="add-app-version"]').clear().type('1.0.1');

    // Errors gone, can navigate
    cy.get('[data-testid="add-app-next"]').should('not.be.disabled');
    cy.get('[data-testid="add-app-next"]').click(); // roles
    cy.get('[data-testid="add-app-next"]').click(); // review

    // Succeed on retry
    cy.intercept('POST', '**/api/micro-apps', { statusCode: 200 }).as('create200');
    cy.get('[data-testid="add-app-submit"]').click();
    cy.wait('@create200');
    cy.contains('Micro app created successfully').should('be.visible');
  });
});
