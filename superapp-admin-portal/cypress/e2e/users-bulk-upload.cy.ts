/// <reference types="cypress" />

// Happy path tests for CSV/JSON bulk upload in CreateUserDialog

const API = '/api';

describe('Users - bulk upload', () => {
  beforeEach(() => {
    // auth bypass
    cy.visit('/');
    cy.window().then((w) => {
      w.localStorage.setItem('e2e-auth', '1');
    });
  });

  it('uploads CSV and creates users (happy path)', () => {
    cy.intercept('GET', `${API}/users`, { fixture: 'users.json' }).as('getUsers1');
    cy.visit('/users');
    cy.wait('@getUsers1');

    // Open create dialog and go to bulk tab
    cy.contains('button', 'Add User').click();
    cy.get('[data-testid="create-user-tab-bulk"]').click();

    // Attach CSV fixture
  cy.get('[data-testid="bulk-upload-input"]').selectFile('cypress/fixtures/users-bulk.csv', { force: true });
  cy.get('[data-testid="bulk-upload-summary"]').should('contain.text', 'Loaded 3 users from file');

    // Intercept POST bulk and subsequent GET
    cy.intercept('POST', `${API}/users`, (req) => {
      // Expect array body
      expect(Array.isArray(req.body)).to.be.true;
      expect(req.body.length).to.equal(3);
      req.reply({ statusCode: 201 });
    }).as('bulkCreate');

    // On success, page refetches users
    cy.intercept('GET', `${API}/users`, (req) => {
      req.reply({ fixture: 'users.json' });
    }).as('getUsers2');

  cy.get('[data-testid="create-user-submit"]').click({ force: true });
    cy.wait('@bulkCreate');
    cy.wait('@getUsers2');

    // Toast and table still visible
    cy.contains('users created successfully', { matchCase: false });
    cy.get('[data-testid="users-table"]').should('exist');
  });

  it('uploads JSON and creates users (happy path)', () => {
    cy.intercept('GET', `${API}/users`, { fixture: 'users.json' }).as('getUsers1');
    cy.visit('/users');
    cy.wait('@getUsers1');

    cy.contains('button', 'Add User').click();
    cy.get('[data-testid="create-user-tab-bulk"]').click();

    // Attach JSON fixture
  cy.get('[data-testid="bulk-upload-input"]').selectFile('cypress/fixtures/users-bulk.json', { force: true });
  cy.get('[data-testid="bulk-upload-summary"]').should('contain.text', 'Loaded 2 users from file');

    cy.intercept('POST', `${API}/users`, (req) => {
      expect(Array.isArray(req.body)).to.be.true;
      expect(req.body.length).to.equal(2);
      req.reply({ statusCode: 201 });
    }).as('bulkCreate');

    cy.intercept('GET', `${API}/users`, (req) => {
      req.reply({ fixture: 'users.json' });
    }).as('getUsers2');

  cy.get('[data-testid="create-user-submit"]').click({ force: true });
    cy.wait('@bulkCreate');
    cy.wait('@getUsers2');

    cy.contains('users created successfully', { matchCase: false });
  });
});
