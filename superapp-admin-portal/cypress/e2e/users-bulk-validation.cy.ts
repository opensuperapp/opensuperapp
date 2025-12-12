/// <reference types="cypress" />

const API_BASE = '/api';

describe('Users - bulk upload validation & partial success', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((w) => w.localStorage.setItem('e2e-auth', '1'));
  });

  it('shows invalid rows with line numbers after CSV upload', () => {
  cy.intercept('GET', `${API_BASE}/users`, { fixture: 'users.json' }).as('getUsers');
    cy.visit('/users');
    cy.wait('@getUsers');

    cy.contains('button', 'Add User').click();
    cy.get('[data-testid="create-user-tab-bulk"]').click();

    cy.get('[data-testid="bulk-upload-input"]').selectFile('cypress/fixtures/users-bulk-invalid.csv', { force: true });

    cy.get('[data-testid="bulk-invalid-title"]').should('be.visible');
    cy.get('[data-testid="bulk-invalid-list"] li').should('have.length.at.least', 2);
    cy.get('[data-testid="bulk-invalid-list"]').should('contain.text', 'Line 2: Invalid email');
    cy.get('[data-testid="bulk-invalid-list"]').should('contain.text', 'Line 3: Missing required fields');
    cy.get('[data-testid="bulk-invalid-list"]').should('contain.text', 'Line 4: Missing required fields');
  });

  it('shows partial success summary and keeps dialog open', () => {
  cy.intercept('GET', `${API_BASE}/users`, { fixture: 'users.json' }).as('getUsers1');
    cy.visit('/users');
    cy.wait('@getUsers1');

    cy.contains('button', 'Add User').click();
    cy.get('[data-testid="create-user-tab-bulk"]').click();

    // Upload valid CSV then simulate server partial success
    cy.get('[data-testid="bulk-upload-input"]').selectFile('cypress/fixtures/users-bulk.csv', { force: true });
    cy.get('[data-testid="bulk-upload-summary"]').should('contain.text', 'Loaded 3 users from file');

    const failed = [
      { workEmail: 'alice@example.com', reason: 'Duplicate' },
    ];
    const success = [
      { workEmail: 'bob@example.com' },
      { workEmail: 'charlie@example.com' },
    ];

  cy.intercept('POST', `${API_BASE}/users`, { statusCode: 207, body: { success, failed } }).as('bulkCreate');

    // Refetch still triggered in UI upon success-only path; for partial we keep dialog open and do not refetch yet
    cy.get('[data-testid="create-user-submit"]').click({ force: true });
    cy.wait('@bulkCreate');

    cy.contains('Created 2 users. 1 failed.');
    // Dialog remains open and inline failure list is shown
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[data-testid="bulk-invalid-list"]').should('contain.text', 'alice@example.com: Duplicate');
  });
});
